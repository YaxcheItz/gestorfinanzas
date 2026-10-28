"""Summarize safe generation records; never echo source logs or private fields."""
import argparse
from collections import deque
import json
import re
import sys

WINDOW_SIZE = 1024
MAX_LINE = 4096
RECORD = re.compile(
    r'(?<!\S)KAPTAL_AI_GENERATION provider=(openai|gemini|groq|unknown) '
    r'outcome=(success|provider_error|invalid_request|busy|invalid_response|budget_denied) '
    r'elapsed_ms=(0|[1-9][0-9]{0,14})\s*$')
REQUEST = re.compile(r'(?<!\S)KAPTAL_AI_REQUEST provider=(groq|gemini) outcome=reserved\s*$')
BUDGET = re.compile(r'(?<!\S)KAPTAL_AI_BUDGET outcome=(unverified|blocked|exhausted|unavailable)\s*$')
USAGE = re.compile(r'(?<!\S)KAPTAL_AI_USAGE provider=(groq|gemini) status=reported '
    r'input_tokens=(0|[1-9][0-9]{0,9}) output_tokens=(0|[1-9][0-9]{0,9}) total_tokens=(0|[1-9][0-9]{0,9})\s*$')
MISSING_USAGE = re.compile(r'(?<!\S)KAPTAL_AI_USAGE provider=(groq|gemini) status=unavailable\s*$')
MAX_TOKEN_COUNT = 1_000_000_000


def summarize(source):
    groups = {}
    requests, budget = {}, {}
    tokens, missing_tokens = {}, {}
    accepted = ignored = 0
    while True:
        line = source.readline(MAX_LINE + 1)
        if not line:
            break
        if len(line) > MAX_LINE:
            while line and not line.endswith('\n'):
                line = source.readline(MAX_LINE + 1)
            ignored += 1
            continue
        request = REQUEST.search(line)
        warning = BUDGET.search(line)
        usage = USAGE.search(line)
        missing = MISSING_USAGE.search(line)
        if usage:
            provider, *raw_counts = usage.groups()
            counts = list(map(int, raw_counts))
            if max(counts) > MAX_TOKEN_COUNT or counts[2] < counts[0] + counts[1]:
                ignored += 1
                continue
            group = tokens.setdefault(provider, {'responses': 0, 'inputTokens': 0, 'outputTokens': 0, 'totalTokens': 0})
            group['responses'] += 1
            for field, value in zip(('inputTokens', 'outputTokens', 'totalTokens'), counts):
                group[field] += value
            continue
        if missing:
            provider = missing.group(1)
            missing_tokens[provider] = missing_tokens.get(provider, 0) + 1
            continue
        if request:
            provider = request.group(1)
            requests[provider] = requests.get(provider, 0) + 1
            continue
        if warning:
            reason = warning.group(1)
            budget[reason] = budget.get(reason, 0) + 1
            continue
        match = RECORD.search(line)
        if not match:
            ignored += 1
            continue
        provider, outcome, duration = match.groups()
        key = provider, outcome
        if key not in groups:
            groups[key] = [0, deque(maxlen=WINDOW_SIZE)]
        group = groups[key]
        group[0] += 1
        group[1].append(int(duration))
        accepted += 1
    output = []
    for (provider, outcome), (count, window) in sorted(groups.items()):
        values = sorted(window)
        size = len(values)
        output.append({'provider': provider, 'outcome': outcome, 'count': count,
                       'windowCount': size, 'minWindowMs': values[0], 'maxWindowMs': values[-1],
                       'meanWindowMs': round(sum(values) / size, 3),
                       'p95WindowMs': values[(95 * size + 99) // 100 - 1]})
    return {'format': 3, 'records': accepted, 'ignoredLines': ignored,
            'reportedTokenUsage': dict(sorted(tokens.items())), 'unavailableTokenUsage': dict(sorted(missing_tokens.items())),
            'outboundAttempts': dict(sorted(requests.items())), 'budgetEvents': dict(sorted(budget.items())),
            'maxWindowRecordsPerGroup': WINDOW_SIZE, 'groups': output}


def main():
    parser = argparse.ArgumentParser(description='Resume métricas de IA sin reproducir los logs originales.')
    parser.add_argument('path', nargs='?', default='-', help='Archivo UTF-8 o - para entrada estándar')
    args = parser.parse_args()
    try:
        if args.path == '-':
            sys.stdin.reconfigure(encoding='utf-8', errors='replace')
            report = summarize(sys.stdin)
        else:
            with open(args.path, encoding='utf-8', errors='replace') as source:
                report = summarize(source)
    except (OSError, UnicodeError):
        print('No se pudo leer la entrada.', file=sys.stderr)
        return 2
    print(json.dumps(report, ensure_ascii=True, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
