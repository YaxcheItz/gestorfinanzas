import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from resumir_ia import summarize, WINDOW_SIZE


def record(ms=10, provider='openai', outcome='success'):
    return ('2026-10-26 INFO com.gestionfinanzas.ai.AiProviderRouter : '
            f'KAPTAL_AI_GENERATION provider={provider} outcome={outcome} elapsed_ms={ms}\n')


class MetricsTest(unittest.TestCase):
    def test_operational_alerts_use_only_aggregate_signals(self):
        report = summarize(io.StringIO(
            'KAPTAL_AI_BUDGET outcome=exhausted\n' * 2
            + 'KAPTAL_AI_USAGE provider=groq status=unavailable\n'
            + record(provider='gemini', outcome='provider_error')
            + 'PRIVATE_CANARY\n'))
        self.assertEqual(report['operationalAlerts'], [
            {'code': 'budget_exhausted', 'count': 2},
            {'code': 'provider_error', 'provider': 'gemini', 'count': 1},
            {'code': 'usage_unavailable', 'provider': 'groq', 'count': 1},
        ])
        self.assertNotIn('PRIVATE_CANARY', json.dumps(report))

    def test_successful_sample_without_warning_signals_has_no_alerts(self):
        self.assertEqual(summarize(io.StringIO(record(provider='groq')))['operationalAlerts'], [])

    def test_budget_denial_is_visible_even_without_the_separate_budget_log(self):
        report = summarize(io.StringIO(record(provider='groq', outcome='budget_denied')))
        self.assertEqual(report['operationalAlerts'], [
            {'code': 'budget_denied', 'provider': 'groq', 'count': 1}])

    def test_all_budget_signals_and_capacity_failures_are_visible_without_thresholds(self):
        reasons = ['blocked', 'exhausted', 'unavailable', 'unverified']
        text = ''.join(f'KAPTAL_AI_BUDGET outcome={reason}\n' for reason in reasons)
        text += record(provider='groq', outcome='busy') + record(provider='groq', outcome='invalid_response')
        report = summarize(io.StringIO(text))
        self.assertEqual([a['code'] for a in report['operationalAlerts']],
                         ['budget_' + r for r in reasons] + ['busy', 'invalid_response'])
        self.assertTrue(all(a['count'] == 1 for a in report['operationalAlerts']))
        self.assertEqual(summarize(io.StringIO(''))['operationalAlerts'], [])

    def test_provider_token_counts_are_aggregated_without_inventing_a_cost(self):
        text = ('KAPTAL_AI_USAGE provider=gemini status=reported input_tokens=10 output_tokens=3 total_tokens=17\n' * 2
            + 'KAPTAL_AI_USAGE provider=groq status=reported input_tokens=4 output_tokens=2 total_tokens=6\n'
            + 'KAPTAL_AI_USAGE provider=gemini status=unavailable\n')
        report = summarize(io.StringIO(text))
        self.assertEqual(report['reportedTokenUsage']['gemini'], {'responses': 2, 'inputTokens': 20, 'outputTokens': 6, 'totalTokens': 34})
        self.assertEqual(report['reportedTokenUsage']['groq']['totalTokens'], 6)
        self.assertEqual(report['unavailableTokenUsage'], {'gemini': 1})
        self.assertEqual(report['records'], 0)
        self.assertNotIn('cost', json.dumps(report).lower())

    def test_missing_usage_is_not_counted_as_reported_zero(self):
        report = summarize(io.StringIO('KAPTAL_AI_USAGE provider=groq status=unavailable\n'
            + 'KAPTAL_AI_USAGE provider=groq status=reported input_tokens=0 output_tokens=0 total_tokens=0\n'))
        self.assertEqual(report['reportedTokenUsage']['groq']['responses'], 1)
        self.assertEqual(report['unavailableTokenUsage']['groq'], 1)

    def test_bad_token_counts_and_private_suffixes_are_ignored(self):
        text = ('KAPTAL_AI_USAGE provider=groq status=reported input_tokens=10 output_tokens=3 total_tokens=12\n'
            + 'KAPTAL_AI_USAGE provider=groq status=reported input_tokens=1000000001 output_tokens=0 total_tokens=1000000001\n'
            + 'KAPTAL_AI_USAGE provider=groq status=reported input_tokens=1 output_tokens=0 total_tokens=1 PRIVATE_CANARY\n'
            + 'KAPTAL_AI_USAGE provider=PRIVATE_CANARY status=unavailable\n')
        report = summarize(io.StringIO(text))
        self.assertEqual(report['reportedTokenUsage'], {})
        self.assertEqual(report['unavailableTokenUsage'], {})
        self.assertEqual(report['ignoredLines'], 4)
        self.assertNotIn('PRIVATE_CANARY', json.dumps(report))
    def test_outbound_attempts_budget_denials_and_generations_stay_separate(self):
        report = summarize(io.StringIO('KAPTAL_AI_REQUEST provider=groq outcome=reserved\n' * 2
            + 'KAPTAL_AI_REQUEST provider=gemini outcome=reserved\n'
            + 'KAPTAL_AI_BUDGET outcome=exhausted\n'
            + record(provider='groq', outcome='budget_denied')))
        self.assertEqual(report['format'], 3)
        self.assertEqual(report['records'], 1)
        self.assertEqual(report['outboundAttempts'], {'gemini': 1, 'groq': 2})
        self.assertEqual(report['budgetEvents'], {'exhausted': 1})
        self.assertEqual(report['ignoredLines'], 0)

    def test_usage_records_with_unknown_fields_or_private_suffix_are_ignored(self):
        text = ('KAPTAL_AI_REQUEST provider=PRIVATE_CANARY outcome=reserved\n'
            + 'KAPTAL_AI_REQUEST provider=groq outcome=reserved PRIVATE_CANARY\n'
            + 'KAPTAL_AI_BUDGET outcome=PRIVATE_CANARY\n')
        report = summarize(io.StringIO(text))
        self.assertEqual(report['ignoredLines'], 3)
        self.assertEqual(report['outboundAttempts'], {})
        self.assertEqual(report['budgetEvents'], {})
        self.assertNotIn('PRIVATE_CANARY', json.dumps(report))
    def test_counts_and_nearest_rank_percentile(self):
        report = summarize(io.StringIO(''.join(record(n) for n in range(1, 21))))
        self.assertEqual(report['records'], 20)
        group = report['groups'][0]
        self.assertEqual((group['count'], group['windowCount']), (20, 20))
        self.assertEqual((group['minWindowMs'], group['maxWindowMs']), (1, 20))
        self.assertEqual(group['meanWindowMs'], 10.5)
        self.assertEqual(group['p95WindowMs'], 19)

    def test_outcomes_and_providers_are_separated(self):
        report = summarize(io.StringIO(record() + record(20, outcome='provider_error')
                                       + record(30, provider='groq') + record(0, outcome='busy')))
        self.assertEqual(len(report['groups']), 4)
        self.assertEqual(sum(g['count'] for g in report['groups']), 4)

    def test_unrecognized_or_private_content_is_never_echoed(self):
        text = ('PRIVATE_CANARY\n' + record(provider='PRIVATE_CANARY')
                + record(outcome='PRIVATE_CANARY') + record(-1) + record('1.25')
                + record() + record()[:-1] + ' PRIVATE_CANARY\n')
        report = summarize(io.StringIO(text))
        self.assertEqual(report['records'], 1)
        self.assertEqual(report['ignoredLines'], 6)
        self.assertNotIn('PRIVATE_CANARY', json.dumps(report))

    def test_statistics_use_only_a_bounded_recent_window(self):
        report = summarize(io.StringIO(record(999999) + record(1) * WINDOW_SIZE))
        group = report['groups'][0]
        self.assertEqual(group['count'], WINDOW_SIZE + 1)
        self.assertEqual(group['windowCount'], WINDOW_SIZE)
        self.assertEqual(group['maxWindowMs'], 1)
        self.assertEqual(group['p95WindowMs'], 1)

    def test_long_lines_are_drained_without_becoming_new_records(self):
        report = summarize(io.StringIO('PRIVATE_CANARY' * 3000 + record() + record(40)))
        self.assertEqual(report['records'], 1)
        self.assertEqual(report['ignoredLines'], 1)
        self.assertEqual(report['groups'][0]['meanWindowMs'], 40)

    def test_cli_outputs_only_aggregate_json(self):
        script = Path(__file__).with_name('resumir_ia.py')
        result = subprocess.run([sys.executable, str(script)], input='PRIVATE_CANARY\n' + record(),
                                text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stderr, '')
        self.assertEqual(json.loads(result.stdout)['records'], 1)
        self.assertNotIn('PRIVATE_CANARY', result.stdout)

    def test_cli_read_errors_do_not_echo_private_paths(self):
        script = Path(__file__).with_name('resumir_ia.py')
        result = subprocess.run([sys.executable, str(script), 'PRIVATE_CANARY/not-present.log'],
                                text=True, capture_output=True, check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, '')
        self.assertNotIn('PRIVATE_CANARY', result.stderr)

    def test_cli_reads_a_private_utf8_file_and_only_outputs_aggregates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'PRIVATE_CANARY.log'
            path.write_text('PRIVATE_CANARY\n' + record(45), encoding='utf-8')
            result = subprocess.run([sys.executable, str(Path(__file__).with_name('resumir_ia.py')), str(path)],
                                    text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)['records'], 1)
        self.assertNotIn('PRIVATE_CANARY', result.stdout + result.stderr)

    def test_cli_replaces_invalid_utf8_without_echoing_it(self):
        script = Path(__file__).with_name('resumir_ia.py')
        result = subprocess.run([sys.executable, str(script)],
                                input=b'\xffPRIVATE_CANARY\n' + record().encode('utf-8'),
                                capture_output=True, check=False)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)['records'], 1)
        self.assertNotIn(b'PRIVATE_CANARY', result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
