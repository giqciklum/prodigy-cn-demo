/* Datos ficticios: ningún registro corresponde a una incidencia real. */
const DEMO_DATA = {
  "lots": [
    {
      "id": "L26-261-FUS-GUI-03",
      "product": "Guisante fino 1 kg",
      "kg": 800,
      "produced": 22,
      "exposed": 8,
      "allocations": [
        {
          "where": "EXP-26-41102",
          "count": 4,
          "shipped": true
        },
        {
          "where": "C-07",
          "count": 8,
          "shipped": false
        },
        {
          "where": "SIL-3",
          "count": 10,
          "shipped": false
        }
      ],
      "origin": {
        "grower": "AGR-0455",
        "parcels": [
          "P-0455-02",
          "P-0455-05"
        ],
        "harvest": "2026-06-25",
        "intake": "REC-26-09412",
        "bulk": "G26-176-FUS-GUI",
        "line": "L2"
      },
      "components": [],
      "line": "L4",
      "production": "2026-09-18",
      "route": [
        "TOL-4",
        "CRB-4",
        "ENV-2",
        "DM-2"
      ],
      "maintenance": []
    },
    {
      "id": "L26-258-FUS-BRO-01",
      "product": "Brócoli floretes 2,5 kg",
      "kg": 720,
      "produced": 18,
      "exposed": 6,
      "allocations": [
        {
          "where": "C-07",
          "count": 6,
          "shipped": false
        },
        {
          "where": "SIL-1",
          "count": 12,
          "shipped": false
        }
      ],
      "origin": {
        "grower": "AGR-0388",
        "parcels": [
          "P-0388-01"
        ],
        "harvest": "2026-05-12",
        "intake": "REC-26-06120",
        "bulk": "G26-132-FUS-BRO",
        "line": "L3"
      },
      "components": [],
      "line": "L4",
      "production": "2026-09-15",
      "route": [
        "TOL-4",
        "CRB-4",
        "ENV-1",
        "DM-2"
      ],
      "maintenance": []
    },
    {
      "id": "L26-262-FUS-MIX-02",
      "product": "Salteado de verduras a la plancha 600 g",
      "kg": 648,
      "produced": 16,
      "exposed": 7,
      "allocations": [
        {
          "where": "EXP-26-41083",
          "count": 9,
          "shipped": true
        },
        {
          "where": "C-07",
          "count": 7,
          "shipped": false
        }
      ],
      "origin": {
        "grower": "Varios orígenes",
        "parcels": [],
        "harvest": "Según componente",
        "intake": "4 recepciones vinculadas",
        "bulk": null,
        "line": "L5"
      },
      "components": [
        {
          "name": "Pimiento rojo asado en tiras",
          "share": 30,
          "bulk": "G26-240-ARG-PIM",
          "grower": "AGR-0702",
          "harvest": "2026-08-28",
          "intake": "REC-26-19905",
          "parcels": [
            "P-0702-04"
          ]
        },
        {
          "name": "Calabacín a la plancha",
          "share": 30,
          "bulk": "G26-236-ARG-CAL",
          "grower": "AGR-0718",
          "harvest": "2026-08-24",
          "intake": "REC-26-19511",
          "parcels": [
            "P-0718-02"
          ]
        },
        {
          "name": "Berenjena a la plancha",
          "share": 20,
          "bulk": "G26-238-ARG-BER",
          "grower": "AGR-0702",
          "harvest": "2026-08-26",
          "intake": "REC-26-19730",
          "parcels": [
            "P-0702-06"
          ]
        },
        {
          "name": "Cebolla asada",
          "share": 20,
          "bulk": "G26-229-ARG-CEB",
          "grower": "AGR-0741",
          "harvest": "2026-08-17",
          "intake": "REC-26-18010",
          "parcels": [
            "P-0741-01"
          ]
        }
      ],
      "line": "L5",
      "production": "2026-09-19",
      "route": [
        "DOS-5",
        "MZ-5",
        "ENV-5",
        "DM-4"
      ],
      "maintenance": []
    },
    {
      "id": "L26-255-ALF-ESP-04",
      "product": "Espinaca en porciones 1 kg",
      "kg": 800,
      "produced": 12,
      "exposed": 5,
      "allocations": [
        {
          "where": "C-07",
          "count": 5,
          "shipped": false
        },
        {
          "where": "SIL-2",
          "count": 7,
          "shipped": false
        }
      ],
      "origin": {
        "grower": "AGR-0291",
        "parcels": [
          "P-0291-03"
        ],
        "harvest": "2026-04-08",
        "intake": "REC-26-04877",
        "bulk": "G26-098-ALF-ESP",
        "line": "ALF-L1"
      },
      "components": [],
      "line": "ALF-L2",
      "production": "2026-09-12",
      "route": [
        "ENV-A2",
        "DM-A1"
      ],
      "maintenance": []
    },
    {
      "id": "L26-259-FUS-JUD-01",
      "product": "Judía verde redonda 1 kg",
      "kg": 800,
      "produced": 20,
      "exposed": 6,
      "allocations": [
        {
          "where": "EXP-26-41071",
          "count": 14,
          "shipped": true
        },
        {
          "where": "C-07",
          "count": 6,
          "shipped": false
        }
      ],
      "origin": {
        "grower": "AGR-0527",
        "parcels": [
          "P-0527-03"
        ],
        "harvest": "2026-09-16",
        "intake": "REC-26-21045",
        "bulk": null,
        "line": "L3"
      },
      "components": [],
      "line": "L3",
      "production": "2026-09-16",
      "route": [
        "LIM-3",
        "COR-3",
        "ESC-3",
        "TUN-2",
        "OPT-3",
        "ENV-3"
      ],
      "maintenance": []
    },
    {
      "id": "L26-263-FUS-MAI-02",
      "product": "Maíz dulce 450 g",
      "kg": 756,
      "produced": 24,
      "exposed": 6,
      "allocations": [
        {
          "where": "C-07",
          "count": 6,
          "shipped": false
        },
        {
          "where": "SIL-4",
          "count": 18,
          "shipped": false
        }
      ],
      "origin": {
        "grower": "AGR-0613",
        "parcels": [
          "P-0613-11",
          "P-0613-12"
        ],
        "harvest": "2026-09-20",
        "intake": "REC-26-21390",
        "bulk": null,
        "line": "L1"
      },
      "components": [],
      "line": "L1",
      "production": "2026-09-20",
      "route": [
        "DES-1",
        "LAV-1",
        "ESC-1",
        "TUN-1",
        "OPT-1",
        "ENV-3",
        "DM-1"
      ],
      "maintenance": []
    },
    {
      "id": "L26-231-FUS-GUI-01",
      "product": "Guisante 1 kg (Garden Peas 1kg)",
      "kg": 800,
      "produced": 22,
      "exposed": 0,
      "allocations": [
        {
          "where": "EXP-26-40911",
          "count": 12,
          "shipped": true
        },
        {
          "where": "EXP-26-40957",
          "count": 8,
          "shipped": true
        },
        {
          "where": "SIL-3",
          "count": 2,
          "shipped": false
        }
      ],
      "origin": {
        "grower": "AGR-0412",
        "parcels": [
          "P-0412-07",
          "P-0412-09"
        ],
        "harvest": "2026-08-19",
        "intake": "REC-26-18233",
        "bulk": null,
        "line": "L2"
      },
      "components": [],
      "line": "L2",
      "production": "2026-08-19",
      "route": [
        "LIM-2",
        "DP-2",
        "ESC-2",
        "TUN-2",
        "OPT-2",
        "ENV-4"
      ],
      "maintenance": [
        {
          "equipment": "DP-2",
          "date": "2026-08-18",
          "work_order": "OT-26-07415",
          "status": "abierta, pendiente de repuesto",
          "text": "desgaste de la malla anotado en la inspección semanal; sustitución programada"
        }
      ]
    }
  ],
  "temperature": [
    -22.1,
    -22.0,
    -22.2,
    -22.1,
    -21.9,
    -22.0,
    -22.1,
    -21.5,
    -20.7,
    -19.4,
    -17.8,
    -17.1,
    -16.5,
    -15.9,
    -15.3,
    -14.8,
    -14.2,
    -13.9,
    -14.4,
    -16.6,
    -18.4,
    -19.3,
    -19.9,
    -20.3,
    -20.5
  ],
  "machines": [
    {
      "code": "TUN-1",
      "area": "Línea L1 (maíz dulce)",
      "reading": -29.5,
      "unit": "°C aire",
      "baseline": -35.0
    },
    {
      "code": "TUN-2",
      "area": "Línea L2 (judía verde)",
      "reading": -35.4,
      "unit": "°C aire",
      "baseline": -35.0
    },
    {
      "code": "ESC-3",
      "area": "Línea L3 (judía verde)",
      "reading": 86.4,
      "unit": "°C agua",
      "baseline": 92.0
    },
    {
      "code": "OPT-2",
      "area": "Línea L2 (judía verde)",
      "reading": 4.8,
      "unit": "% rechazo",
      "baseline": 1.5
    },
    {
      "code": "NH3-C1",
      "area": "Sala de máquinas frigorífica",
      "reading": 2.3,
      "unit": "mm/s RMS",
      "baseline": 2.1
    },
    {
      "code": "NH3-C2",
      "area": "Sala de máquinas frigorífica",
      "reading": 6.2,
      "unit": "mm/s RMS",
      "baseline": 2.2
    },
    {
      "code": "EV-SIL3",
      "area": "Silo automático 3",
      "reading": 14.0,
      "unit": "h",
      "baseline": 8.0
    },
    {
      "code": "ENV-5",
      "area": "Sala de envasado (mezclas)",
      "reading": 7.0,
      "unit": "paradas/h",
      "baseline": 2.0
    },
    {
      "code": "DM-1",
      "area": "Línea L1 (maíz dulce), salida de envasado",
      "reading": 3.5,
      "unit": "h",
      "baseline": 2.0
    },
    {
      "code": "LAV-1",
      "area": "Línea L1 (maíz dulce)",
      "reading": 2.6,
      "unit": "ppm",
      "baseline": 3.0
    },
    {
      "code": "CAL-B1",
      "area": "Sala de calderas",
      "reading": 9.8,
      "unit": "bar",
      "baseline": 10.0
    }
  ]
};
