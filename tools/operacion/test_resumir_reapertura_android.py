import json
import unittest

from resumir_reapertura_android import PRIMER_PLANO, resumir


class ReaperturaAndroidTest(unittest.TestCase):
    def test_resumenes_solapados_y_datos_visibles(self):
        reporte = resumir({
            "fases": [
                PRIMER_PLANO,
                "phase=inicio elapsed_ms=1000",
                "phase=resumen elapsed_ms=3000 http=200 request_ms=2000",
                "phase=resumen elapsed_ms=3500 http=200 request_ms=2000",
                "phase=inicio_datos elapsed_ms=3600",
            ],
            "arranqueAndroid": ["LaunchState: WARM", "TotalTime: 700", "WaitTime: 800"],
            "mismoApkEnUltimoUso": True,
            "instalacionVerificada": True,
        })

        self.assertTrue(reporte["mismaInstalacionVerificada"])
        self.assertEqual(reporte["android"], {"estado": "WARM", "totalMs": 700, "esperaMs": 800})
        self.assertEqual(reporte["hitosMs"]["inicio_datos"], 3600)
        self.assertEqual(reporte["solapamientos"], [{"peticiones": [1, 2], "duracionEstimadaMs": 1500}])
        self.assertEqual(reporte["ultimoResumenExitosoADatosMs"], 100)

    def test_referencia_historica_con_reintento_y_sin_datos_visibles(self):
        reporte = resumir({
            "events": [
                PRIMER_PLANO,
                "phase=renovacion elapsed_ms=1600 http=503 request_ms=1500",
                "phase=renovacion elapsed_ms=2300 http=0 request_ms=600",
                "phase=inicio_error elapsed_ms=2400",
            ],
            "displayedLog": ["+1s242ms"],
            "firstOpenAfterUpdate": True,
        })

        self.assertFalse(reporte["mismaInstalacionVerificada"])
        self.assertEqual(reporte["android"]["displayedMs"], 1242)
        self.assertEqual([peticion["http"] for peticion in reporte["peticiones"]], [503, 0])
        self.assertEqual(reporte["solapamientos"], [])
        self.assertNotIn("inicio_datos", reporte["hitosMs"])
        self.assertIsNone(reporte["ultimoResumenExitosoADatosMs"])

    def test_datos_ya_visibles_antes_de_la_respuesta(self):
        reporte = resumir({"fases": [
            PRIMER_PLANO,
            "phase=inicio_datos elapsed_ms=120",
            "phase=resumen elapsed_ms=700 http=200 request_ms=370",
        ]})

        self.assertEqual(reporte["hitosMs"]["inicio_datos"], 120)
        self.assertIsNone(reporte["ultimoResumenExitosoADatosMs"])

    def test_descarta_campos_privados_y_tiempos_imposibles(self):
        reporte = resumir({"fases": [
            PRIMER_PLANO,
            "phase=perfil elapsed_ms=500 http=200 request_ms=300 cuenta=CANARY",
            "phase=resumen elapsed_ms=500 http=700 request_ms=300",
            "phase=resumen elapsed_ms=500 http=200 request_ms=1000",
            "phase=inicio_datos elapsed_ms=300001",
        ]})

        self.assertEqual(reporte["lineasDescartadas"], 4)
        self.assertEqual(reporte["peticiones"], [])
        self.assertNotIn("CANARY", json.dumps(reporte))

    def test_rechaza_una_captura_vacia_o_ambigua(self):
        for fases in ([], [PRIMER_PLANO, PRIMER_PLANO]):
            with self.subTest(fases=fases), self.assertRaises(ValueError):
                resumir({"fases": fases})
