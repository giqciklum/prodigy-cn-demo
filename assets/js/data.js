/* Datos sintéticos de demostración (Ciklum). Generado desde cn_demo/world.yaml. */
window.CN_DATA = {
 "meta": {
  "company": "Congelados de Navarra",
  "company_short": "CN",
  "today": "2026-09-29",
  "weekday": "martes",
  "tomorrow": "2026-09-30",
  "alarm_time": "05:50",
  "timezone": "Europe/Madrid",
  "disclaimer": "Datos sintéticos de demostración",
  "sscc_extension_digit": "3",
  "sscc_company_prefix": "8412345",
  "systems": {
   "erp": "SAP",
   "quality_erp": "SAP QM",
   "mes": "MES Mapex",
   "aps": "Siemens Opcenter APS",
   "wms": "Mecalux Easy WMS",
   "scada": "SCADA Galileo",
   "quality": "Elara (gestión de calidad)"
  },
  "production_systems": {
   "cold_chain_monitor": "SCADA Galileo + Mecalux Easy WMS",
   "lot_traceability": "SAP + MES Mapex + Mecalux Easy WMS",
   "quality_hold": "SAP QM + Mecalux Easy WMS",
   "complaint_intake": "Elara + buzón de calidad",
   "quality_incident": "Elara + Jira",
   "cn_plant_monitor": "MES Mapex + SCADA Galileo",
   "campaign_planner": "Siemens Opcenter APS + SAP",
   "workflow_builder": "Prodigy Orchestrator Routines"
  }
 },
 "roles": {
  "quality_shift": "Responsable de Calidad de turno",
  "dispatch_shift": "Jefe de turno de expedición",
  "refrigeration_maintenance": "Mantenimiento frigorífico",
  "quality_plant": "Responsable de Calidad de planta",
  "line_maintenance": "Mantenimiento de línea",
  "campaign_manager": "Jefe de campaña",
  "customer_quality": "Equipo de Calidad del cliente"
 },
 "plants": [
  {
   "code": "FUS",
   "name": "Fustiñana",
   "town": "Fustiñana",
   "province": "Navarra",
   "company": "Congelados de Navarra, S.A.U.",
   "role": "Sede operativa, planta principal y hub logístico",
   "storage": "4 silos automáticos a -25 °C (Mecalux Easy WMS) + cámaras de expedición"
  },
  {
   "code": "ARG",
   "name": "Arguedas",
   "town": "Arguedas",
   "province": "Navarra",
   "company": "Congelados de Navarra, S.A.U.",
   "role": "Prefritos, asados/grill, IQF y envasado a granel",
   "storage": "Cámaras de producto terminado a -25 °C"
  },
  {
   "code": "ALF",
   "name": "Alcorioja",
   "town": "Alfaro",
   "province": "La Rioja",
   "company": "Alimentos Congelados de La Rioja, S.A.",
   "role": "Verdura de hoja, mezclas y envasado",
   "storage": "Cámara de granel a -25 °C"
  },
  {
   "code": "OLM",
   "name": "Iberfresco",
   "town": "Olmedo",
   "province": "Valladolid",
   "company": "Iberfresco Fresh Product Company, S.L.U.",
   "role": "Lavado, pelado, corte, escaldado, IQF y envasado",
   "storage": "Cámara de producto terminado a -25 °C"
  },
  {
   "code": "VEG",
   "name": "Congelados de la Vega",
   "town": "Formentera del Segura",
   "province": "Alicante",
   "company": "Congelados de La Vega, S.L.",
   "role": "Procesado IQF y envasado a granel (alcachofa)",
   "storage": "Cámara de producto terminado a -25 °C"
  }
 ],
 "procedures": {
  "PNT-CAL-012": {
   "title": "Excursiones de temperatura en cámaras de producto congelado",
   "limit_c": -18.0,
   "critical_c": -15.0,
   "min_minutes_for_hold": 15,
   "summary": "Temperatura de aire por encima de -18 °C durante más de 15 min: bloqueo de calidad de los palés expuestos y evaluación (temperatura de producto, análisis sensorial, decisión de destino). Por encima de -15 °C: excursión crítica.",
   "evaluation": [
    "Medir la temperatura de producto con sonda en los palés expuestos (capa exterior y centro)",
    "Análisis sensorial y de aspecto (cristales de hielo, apelmazado) por lote",
    "Decisión de destino por lote: liberar, reclasificar o destruir"
   ]
  },
  "PNT-CAL-015": {
   "title": "Bloqueo y liberación de producto (retención de calidad)",
   "summary": "Todo bloqueo se registra en SAP QM (lote bloqueado) y en Easy WMS (palés inmovilizados, expediciones retenidas). Solo el Responsable de Calidad libera."
  },
  "PNT-CAL-020": {
   "title": "Gestión de reclamaciones de cliente e informe 8D",
   "summary": "Acuse de recibo en 24 h, contención en 48 h e informe 8D en el plazo pactado con el cliente (por defecto, 5 días hábiles)."
  },
  "PNT-CAL-031": {
   "title": "Control de cuerpos extraños: despedregadoras, ópticas y detectores de metales",
   "summary": "El detector de metales es un PCC: verificación con probetas cada 2 h. Si se supera, se retiene el producto envasado desde la última verificación correcta."
  },
  "IT-MAN-DP-02": {
   "title": "Inspección y sustitución de mallas de despedregadora",
   "summary": "Inspección semanal de la malla; si hay desgaste, sustitución programada e inspección reforzada hasta cambiarla."
  }
 },
 "customers": {
  "CLI-RET-ES": {
   "label": "Plataforma logística retail ES",
   "country": "ES",
   "channel": "Retail"
  },
  "CLI-FS-ES": {
   "label": "Distribuidor foodservice ES (zona centro)",
   "country": "ES",
   "channel": "Foodservice"
  },
  "CLI-FWF-UK": {
   "label": "Freeworld Foods Ltd (filial CN, Reino Unido)",
   "end_customer": "Retailer UK (marca blanca)",
   "country": "UK",
   "channel": "Retail UK"
  },
  "CLI-IMP-FR": {
   "label": "Importador Francia",
   "country": "FR",
   "channel": "Exportación"
  },
  "CLI-CNUS": {
   "label": "CN Frozen Foods LLC (filial CN, EE. UU.)",
   "country": "US",
   "channel": "Exportación"
  }
 },
 "shipments": {
  "EXP-26-40911": {
   "date": "2026-08-25",
   "time": "16:10",
   "status": "expedida",
   "customer": "CLI-FWF-UK",
   "transport": "Camión frigorífico -25 °C",
   "temp_record": "conforme",
   "from_plant": "FUS"
  },
  "EXP-26-40957": {
   "date": "2026-08-28",
   "time": "15:30",
   "status": "expedida",
   "customer": "CLI-FWF-UK",
   "transport": "Camión frigorífico -25 °C",
   "temp_record": "conforme",
   "from_plant": "FUS"
  },
  "EXP-26-41071": {
   "date": "2026-09-23",
   "time": "17:45",
   "status": "expedida",
   "customer": "CLI-IMP-FR",
   "transport": "Camión frigorífico -25 °C",
   "temp_record": "conforme",
   "from_plant": "FUS"
  },
  "EXP-26-41083": {
   "date": "2026-09-25",
   "time": "14:20",
   "status": "expedida",
   "customer": "CLI-FWF-UK",
   "transport": "Camión frigorífico -25 °C",
   "temp_record": "conforme",
   "from_plant": "FUS"
  },
  "EXP-26-41102": {
   "date": "2026-09-28",
   "time": "18:40",
   "status": "expedida",
   "customer": "CLI-RET-ES",
   "transport": "Camión frigorífico -25 °C",
   "temp_record": "conforme",
   "from_plant": "FUS"
  },
  "EXP-26-41106": {
   "date": "2026-09-29",
   "time": "09:30",
   "status": "planificada",
   "customer": "CLI-FS-ES",
   "transport": "Camión frigorífico -25 °C",
   "dock": "Muelle 2",
   "from_plant": "FUS"
  },
  "EXP-26-41107": {
   "date": "2026-09-29",
   "time": "11:00",
   "status": "planificada",
   "customer": "CLI-RET-ES",
   "transport": "Camión frigorífico -25 °C",
   "dock": "Muelle 3",
   "from_plant": "FUS"
  },
  "EXP-26-41109": {
   "date": "2026-09-29",
   "time": "14:00",
   "status": "planificada",
   "customer": "CLI-FWF-UK",
   "transport": "Camión frigorífico -25 °C",
   "dock": "Muelle 4",
   "from_plant": "FUS"
  },
  "EXP-26-41111": {
   "date": "2026-09-29",
   "time": "16:30",
   "status": "planificada",
   "customer": "CLI-IMP-FR",
   "transport": "Camión frigorífico -25 °C",
   "dock": "Muelle 5",
   "from_plant": "FUS"
  },
  "EXP-26-41118": {
   "date": "2026-09-30",
   "time": "07:00",
   "status": "planificada",
   "customer": "CLI-CNUS",
   "transport": "Contenedor reefer (consolidación, salida por puerto)",
   "dock": "Muelle 6",
   "from_plant": "FUS"
  }
 },
 "growers": {
  "AGR-0412": {
   "zone": "Ribera navarra",
   "municipality": "Ribaforada",
   "crops": [
    "guisante",
    "judía verde"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0455": {
   "zone": "Ribera navarra",
   "municipality": "Cortes",
   "crops": [
    "guisante"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0388": {
   "zone": "Ribera navarra",
   "municipality": "Cadreita",
   "crops": [
    "brócoli"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0291": {
   "zone": "Rioja Baja",
   "municipality": "Alfaro",
   "crops": [
    "espinaca"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0527": {
   "zone": "Ribera navarra",
   "municipality": "Castejón",
   "crops": [
    "judía verde"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0540": {
   "zone": "Ribera navarra",
   "municipality": "Cortes",
   "crops": [
    "judía verde"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0561": {
   "zone": "Ribera navarra",
   "municipality": "Ribaforada",
   "crops": [
    "judía verde"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0613": {
   "zone": "Ribera navarra",
   "municipality": "Valtierra",
   "crops": [
    "maíz dulce"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0634": {
   "zone": "Ribera navarra",
   "municipality": "Cadreita",
   "crops": [
    "maíz dulce"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0658": {
   "zone": "Ribera navarra",
   "municipality": "Milagro",
   "crops": [
    "maíz dulce"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0671": {
   "zone": "Ribera navarra",
   "municipality": "Castejón",
   "crops": [
    "maíz dulce"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0702": {
   "zone": "Ribera navarra",
   "municipality": "Arguedas",
   "crops": [
    "pimiento",
    "berenjena"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0718": {
   "zone": "Ribera navarra",
   "municipality": "Tudela",
   "crops": [
    "calabacín"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0719": {
   "zone": "Ribera alta del Ebro",
   "municipality": "Mendavia",
   "crops": [
    "maíz dulce"
   ],
   "contract": "Contrato de campaña 2026"
  },
  "AGR-0741": {
   "zone": "Ribera navarra",
   "municipality": "Cabanillas",
   "crops": [
    "cebolla"
   ],
   "contract": "Contrato de campaña 2026"
  }
 },
 "parcels": {
  "P-0412-07": {
   "grower": "AGR-0412",
   "municipality": "Ribaforada",
   "zone": "Ribera navarra",
   "crop": "guisante",
   "ha": 4.2,
   "sowing_date": "2026-05-28"
  },
  "P-0412-09": {
   "grower": "AGR-0412",
   "municipality": "Ribaforada",
   "zone": "Ribera navarra",
   "crop": "guisante",
   "ha": 3.6,
   "sowing_date": "2026-05-30"
  },
  "P-0455-02": {
   "grower": "AGR-0455",
   "municipality": "Cortes",
   "zone": "Ribera navarra",
   "crop": "guisante",
   "ha": 5.1,
   "sowing_date": "2026-03-10"
  },
  "P-0455-05": {
   "grower": "AGR-0455",
   "municipality": "Cortes",
   "zone": "Ribera navarra",
   "crop": "guisante",
   "ha": 4.4,
   "sowing_date": "2026-03-12"
  },
  "P-0388-01": {
   "grower": "AGR-0388",
   "municipality": "Cadreita",
   "zone": "Ribera navarra",
   "crop": "brócoli",
   "ha": 6.0,
   "sowing_date": "2026-02-20"
  },
  "P-0291-03": {
   "grower": "AGR-0291",
   "municipality": "Alfaro",
   "zone": "Rioja Baja",
   "crop": "espinaca",
   "ha": 3.8,
   "sowing_date": "2026-02-15"
  },
  "P-0527-03": {
   "grower": "AGR-0527",
   "municipality": "Castejón",
   "zone": "Ribera navarra",
   "crop": "judía verde",
   "ha": 5.5,
   "sowing_date": "2026-07-01"
  },
  "P-0613-11": {
   "grower": "AGR-0613",
   "municipality": "Valtierra",
   "zone": "Ribera navarra",
   "crop": "maíz dulce",
   "ha": 1.2,
   "sowing_date": "2026-06-01"
  },
  "P-0613-12": {
   "grower": "AGR-0613",
   "municipality": "Valtierra",
   "zone": "Ribera navarra",
   "crop": "maíz dulce",
   "ha": 0.9,
   "sowing_date": "2026-06-03"
  },
  "P-0702-04": {
   "grower": "AGR-0702",
   "municipality": "Arguedas",
   "zone": "Ribera navarra",
   "crop": "pimiento",
   "ha": 2.6,
   "sowing_date": "2026-05-05"
  },
  "P-0702-06": {
   "grower": "AGR-0702",
   "municipality": "Arguedas",
   "zone": "Ribera navarra",
   "crop": "berenjena",
   "ha": 1.9,
   "sowing_date": "2026-05-08"
  },
  "P-0718-02": {
   "grower": "AGR-0718",
   "municipality": "Tudela",
   "zone": "Ribera navarra",
   "crop": "calabacín",
   "ha": 2.2,
   "sowing_date": "2026-06-10"
  },
  "P-0741-01": {
   "grower": "AGR-0741",
   "municipality": "Cabanillas",
   "zone": "Ribera navarra",
   "crop": "cebolla",
   "ha": 3.0,
   "sowing_date": "2026-03-01"
  }
 },
 "lines": {
  "L1": {
   "plant": "FUS",
   "name": "Línea L1 (maíz dulce)"
  },
  "L2": {
   "plant": "FUS",
   "name": "Línea L2 (guisante / judía verde)"
  },
  "L3": {
   "plant": "FUS",
   "name": "Línea L3 (judía verde / brócoli)"
  },
  "L4": {
   "plant": "FUS",
   "name": "Línea L4 (reenvasado desde granel)"
  },
  "L5": {
   "plant": "FUS",
   "name": "Línea L5 (mezclas)"
  },
  "ARG-G1": {
   "plant": "ARG",
   "name": "Línea de grill G1 (Arguedas)"
  },
  "ALF-L1": {
   "plant": "ALF",
   "name": "Línea de hoja L1 (Alcorioja)"
  },
  "ALF-L2": {
   "plant": "ALF",
   "name": "Línea de envasado L2 (Alcorioja)"
  }
 },
 "equipment": {
  "DES-1": {
   "plant": "FUS",
   "line": "L1",
   "type": "desgranadora",
   "short": "desgranadora",
   "name": "Desgranadora de maíz DES-1"
  },
  "LAV-1": {
   "plant": "FUS",
   "line": "L1",
   "type": "lavadora",
   "short": "lavadora",
   "name": "Lavadora de verdura LAV-1"
  },
  "ESC-1": {
   "plant": "FUS",
   "line": "L1",
   "type": "escaldador",
   "short": "escaldador",
   "name": "Escaldador de tambor ESC-1"
  },
  "TUN-1": {
   "plant": "FUS",
   "line": "L1",
   "type": "tunel_iqf",
   "short": "túnel IQF",
   "name": "Túnel IQF TUN-1"
  },
  "OPT-1": {
   "plant": "FUS",
   "line": "L1",
   "type": "optica",
   "short": "óptica",
   "name": "Selectora óptica OPT-1"
  },
  "DM-1": {
   "plant": "FUS",
   "line": "L1",
   "type": "detector_metales",
   "short": "detector de metales",
   "name": "Detector de metales DM-1"
  },
  "LIM-2": {
   "plant": "FUS",
   "line": "L2",
   "type": "limpiadora",
   "short": "limpieza",
   "name": "Limpiadora-aventadora LIM-2"
  },
  "DP-2": {
   "plant": "FUS",
   "line": "L2",
   "type": "despedregadora",
   "short": "despedregadora",
   "name": "Despedregadora DP-2"
  },
  "ESC-2": {
   "plant": "FUS",
   "line": "L2",
   "type": "escaldador",
   "short": "escaldador",
   "name": "Escaldador ESC-2"
  },
  "TUN-2": {
   "plant": "FUS",
   "line": "L2",
   "type": "tunel_iqf",
   "short": "túnel IQF",
   "name": "Túnel IQF TUN-2"
  },
  "OPT-2": {
   "plant": "FUS",
   "line": "L2",
   "type": "optica",
   "short": "óptica",
   "name": "Selectora óptica OPT-2"
  },
  "LIM-3": {
   "plant": "FUS",
   "line": "L3",
   "type": "limpiadora",
   "short": "limpieza",
   "name": "Limpiadora LIM-3"
  },
  "COR-3": {
   "plant": "FUS",
   "line": "L3",
   "type": "cortadora",
   "short": "despuntadora/cortadora",
   "name": "Despuntadora-cortadora COR-3"
  },
  "ESC-3": {
   "plant": "FUS",
   "line": "L3",
   "type": "escaldador",
   "short": "escaldador",
   "name": "Escaldador de banda ESC-3"
  },
  "OPT-3": {
   "plant": "FUS",
   "line": "L3",
   "type": "optica",
   "short": "óptica",
   "name": "Selectora óptica OPT-3"
  },
  "TOL-4": {
   "plant": "FUS",
   "line": "L4",
   "type": "volcador",
   "short": "volcador de octavines",
   "name": "Volcador de octavines TOL-4"
  },
  "CRB-4": {
   "plant": "FUS",
   "line": "L4",
   "type": "criba",
   "short": "criba de desterronado",
   "name": "Criba de desterronado CRB-4"
  },
  "DM-2": {
   "plant": "FUS",
   "line": "L4",
   "type": "detector_metales",
   "short": "detector de metales",
   "name": "Detector de metales DM-2"
  },
  "DOS-5": {
   "plant": "FUS",
   "line": "L5",
   "type": "dosificadora",
   "short": "dosificación",
   "name": "Dosificadora multicabezal DOS-5"
  },
  "MZ-5": {
   "plant": "FUS",
   "line": "L5",
   "type": "mezcladora",
   "short": "mezcladora",
   "name": "Mezcladora MZ-5"
  },
  "DM-4": {
   "plant": "FUS",
   "line": "L5",
   "type": "detector_metales",
   "short": "detector de metales",
   "name": "Detector de metales DM-4"
  },
  "ENV-1": {
   "plant": "FUS",
   "line": "L4",
   "type": "envasadora",
   "short": "envasado",
   "name": "Envasadora foodservice ENV-1"
  },
  "ENV-2": {
   "plant": "FUS",
   "line": "L4",
   "type": "envasadora",
   "short": "envasado",
   "name": "Envasadora retail ENV-2"
  },
  "ENV-3": {
   "plant": "FUS",
   "line": "L1",
   "type": "envasadora",
   "short": "envasado",
   "name": "Envasadora ENV-3"
  },
  "ENV-4": {
   "plant": "FUS",
   "line": "L2",
   "type": "envasadora",
   "short": "envasado",
   "name": "Envasadora ENV-4"
  },
  "ENV-5": {
   "plant": "FUS",
   "line": "L5",
   "type": "envasadora",
   "short": "envasado",
   "name": "Envasadora de mezclas ENV-5"
  },
  "NH3-C1": {
   "plant": "FUS",
   "line": "frio",
   "type": "compresor_nh3",
   "short": "compresor NH3",
   "name": "Compresor de amoniaco NH3-C1"
  },
  "NH3-C2": {
   "plant": "FUS",
   "line": "frio",
   "type": "compresor_nh3",
   "short": "compresor NH3",
   "name": "Compresor de amoniaco NH3-C2"
  },
  "EV-07": {
   "plant": "FUS",
   "line": "frio",
   "type": "evaporador",
   "short": "evaporador",
   "name": "Evaporador EV-07 (cámara C-07)"
  },
  "P-07": {
   "plant": "FUS",
   "line": "frio",
   "type": "puerta_rapida",
   "short": "puerta rápida",
   "name": "Puerta rápida P-07 (cámara C-07)"
  },
  "EV-SIL3": {
   "plant": "FUS",
   "line": "frio",
   "type": "evaporador",
   "short": "evaporador",
   "name": "Evaporador EV-SIL3 (silo automático 3)"
  },
  "CAL-B1": {
   "plant": "FUS",
   "line": "servicios",
   "type": "caldera",
   "short": "caldera",
   "name": "Caldera de vapor CAL-B1"
  },
  "GRL-1": {
   "plant": "ARG",
   "line": "ARG-G1",
   "type": "grill",
   "short": "grill (plancha)",
   "name": "Grill continuo GRL-1"
  },
  "TUN-A1": {
   "plant": "ARG",
   "line": "ARG-G1",
   "type": "tunel_iqf",
   "short": "túnel IQF",
   "name": "Túnel IQF TUN-A1"
  },
  "LAV-A1": {
   "plant": "ALF",
   "line": "ALF-L1",
   "type": "lavadora",
   "short": "lavadora",
   "name": "Lavadora de hoja LAV-A1"
  },
  "ESC-A1": {
   "plant": "ALF",
   "line": "ALF-L1",
   "type": "escaldador",
   "short": "escaldador",
   "name": "Escaldador ESC-A1"
  },
  "PRT-A1": {
   "plant": "ALF",
   "line": "ALF-L1",
   "type": "porcionadora",
   "short": "porcionadora",
   "name": "Porcionadora de espinaca PRT-A1"
  },
  "TUN-A2": {
   "plant": "ALF",
   "line": "ALF-L1",
   "type": "tunel_iqf",
   "short": "túnel IQF",
   "name": "Túnel IQF TUN-A2"
  },
  "ENV-A2": {
   "plant": "ALF",
   "line": "ALF-L2",
   "type": "envasadora",
   "short": "envasado",
   "name": "Envasadora ENV-A2"
  },
  "DM-A1": {
   "plant": "ALF",
   "line": "ALF-L2",
   "type": "detector_metales",
   "short": "detector de metales",
   "name": "Detector de metales DM-A1"
  }
 },
 "chamber_c07": {
  "code": "C-07",
  "plant": "FUS",
  "name": "Cámara de expedición 7",
  "type": "expedición",
  "setpoint_c": -22.0,
  "limit_c": -18.0,
  "critical_c": -15.0,
  "capacity_pallets": 240,
  "evaporator": "EV-07",
  "door": "P-07",
  "sensor": "TT-C07-01",
  "alarm_id": "ALM-C07-0550",
  "events": [
   {
    "time": "05:35",
    "end": "05:40",
    "equipment": "EV-07",
    "type": "pre-desescarche",
    "text": "Parada de ventiladores de EV-07 (inicio del ciclo de desescarche)"
   },
   {
    "time": "05:40",
    "end": "06:05",
    "equipment": "EV-07",
    "type": "desescarche",
    "text": "Desescarche programado de EV-07"
   },
   {
    "time": "05:50",
    "type": "alarma",
    "ref": "ALM-C07-0550",
    "text": "Alarma SCADA: temperatura de aire por encima de -18 °C"
   },
   {
    "time": "05:52",
    "end": "06:31",
    "equipment": "P-07",
    "type": "puerta",
    "text": "Sensor de puerta P-07 abierta: la puerta rápida no completa el cierre"
   },
   {
    "time": "06:31",
    "equipment": "P-07",
    "type": "puerta",
    "text": "Cierre manual de P-07 por el Jefe de turno de expedición"
   },
   {
    "time": "06:40",
    "type": "recuperación",
    "text": "La temperatura de aire vuelve por debajo de -18 °C"
   }
  ],
  "probable_cause": "Hipótesis a confirmar por Mantenimiento frigorífico: el desescarche de EV-07 (05:40-06:05) se solapó con un fallo de cierre de la puerta rápida P-07 (sensor de puerta abierta 05:52-06:31).",
  "has_series": true,
  "plant_name": "Fustiñana",
  "current_c": -20.5,
  "current_time": "07:00"
 },
 "chamber_c07_series": [
  {
   "time": "05:00",
   "temp_c": -22.1
  },
  {
   "time": "05:05",
   "temp_c": -22.0
  },
  {
   "time": "05:10",
   "temp_c": -22.2
  },
  {
   "time": "05:15",
   "temp_c": -22.1
  },
  {
   "time": "05:20",
   "temp_c": -21.9
  },
  {
   "time": "05:25",
   "temp_c": -22.0
  },
  {
   "time": "05:30",
   "temp_c": -22.1
  },
  {
   "time": "05:35",
   "temp_c": -21.5
  },
  {
   "time": "05:40",
   "temp_c": -20.7
  },
  {
   "time": "05:45",
   "temp_c": -19.4
  },
  {
   "time": "05:50",
   "temp_c": -17.8
  },
  {
   "time": "05:55",
   "temp_c": -17.1
  },
  {
   "time": "06:00",
   "temp_c": -16.5
  },
  {
   "time": "06:05",
   "temp_c": -15.9
  },
  {
   "time": "06:10",
   "temp_c": -15.3
  },
  {
   "time": "06:15",
   "temp_c": -14.8
  },
  {
   "time": "06:20",
   "temp_c": -14.2
  },
  {
   "time": "06:25",
   "temp_c": -13.9
  },
  {
   "time": "06:30",
   "temp_c": -14.4
  },
  {
   "time": "06:35",
   "temp_c": -16.6
  },
  {
   "time": "06:40",
   "temp_c": -18.4
  },
  {
   "time": "06:45",
   "temp_c": -19.3
  },
  {
   "time": "06:50",
   "temp_c": -19.9
  },
  {
   "time": "06:55",
   "temp_c": -20.3
  },
  {
   "time": "07:00",
   "temp_c": -20.5
  }
 ],
 "excursion_c07": {
  "chamber": "C-07",
  "chamber_name": "Cámara de expedición 7",
  "plant": "FUS",
  "date": "2026-09-29",
  "limit": -18.0,
  "critical": -15.0,
  "interval_min": 5,
  "has_excursion": true,
  "start": "05:50",
  "end": "06:40",
  "minutes_above_limit": 50,
  "samples": [
   {
    "time": "05:50",
    "temp_c": -17.8
   },
   {
    "time": "05:55",
    "temp_c": -17.1
   },
   {
    "time": "06:00",
    "temp_c": -16.5
   },
   {
    "time": "06:05",
    "temp_c": -15.9
   },
   {
    "time": "06:10",
    "temp_c": -15.3
   },
   {
    "time": "06:15",
    "temp_c": -14.8
   },
   {
    "time": "06:20",
    "temp_c": -14.2
   },
   {
    "time": "06:25",
    "temp_c": -13.9
   },
   {
    "time": "06:30",
    "temp_c": -14.4
   },
   {
    "time": "06:35",
    "temp_c": -16.6
   }
  ],
  "critical_start": "06:15",
  "critical_end": "06:35",
  "minutes_above_critical": 20,
  "peak": -13.9,
  "peak_time": "06:25",
  "hold_required": true,
  "rule": "PNT-CAL-012",
  "severity": "critica",
  "series_start": "05:00",
  "series_end": "07:00"
 },
 "lots_in_c07": [
  {
   "lot": "L26-261-FUS-GUI-03",
   "product": "Guisante fino 1 kg",
   "brand": "Verleal (retail ES)",
   "pallets": 8,
   "sku": "VL-GUI-1000",
   "channel": "Retail ES",
   "kg_per_pallet": 800,
   "std_cost_eur_kg": 1.6,
   "lane": 2,
   "planned_shipment": "EXP-26-41107",
   "planned_date": "2026-09-29",
   "planned_time": "11:00",
   "customer": "Plataforma logística retail ES",
   "kg": 6400
  },
  {
   "lot": "L26-258-FUS-BRO-01",
   "product": "Brócoli floretes 2,5 kg",
   "brand": "CN foodservice",
   "pallets": 6,
   "sku": "CN-BRO-2500",
   "channel": "Foodservice ES",
   "kg_per_pallet": 720,
   "std_cost_eur_kg": 1.75,
   "lane": 1,
   "planned_shipment": "EXP-26-41106",
   "planned_date": "2026-09-29",
   "planned_time": "09:30",
   "customer": "Distribuidor foodservice ES (zona centro)",
   "kg": 4320
  },
  {
   "lot": "L26-262-FUS-MIX-02",
   "product": "Salteado de verduras a la plancha 600 g",
   "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
   "pallets": 7,
   "sku": "UK-MIX-600",
   "channel": "Retail UK (vía Freeworld Foods)",
   "kg_per_pallet": 648,
   "std_cost_eur_kg": 2.4,
   "lane": 4,
   "planned_shipment": "EXP-26-41109",
   "planned_date": "2026-09-29",
   "planned_time": "14:00",
   "customer": "Freeworld Foods Ltd (filial CN, Reino Unido)",
   "kg": 4536
  },
  {
   "lot": "L26-255-ALF-ESP-04",
   "product": "Espinaca en porciones 1 kg",
   "brand": "Verleal",
   "pallets": 5,
   "sku": "VL-ESP-1000",
   "channel": "Retail ES",
   "kg_per_pallet": 800,
   "std_cost_eur_kg": 1.5,
   "lane": 3,
   "planned_shipment": "EXP-26-41107",
   "planned_date": "2026-09-29",
   "planned_time": "11:00",
   "customer": "Plataforma logística retail ES",
   "kg": 4000
  },
  {
   "lot": "L26-259-FUS-JUD-01",
   "product": "Judía verde redonda 1 kg",
   "brand": "Importador Francia",
   "pallets": 6,
   "sku": "FR-JUD-1000",
   "channel": "Exportación Francia",
   "kg_per_pallet": 800,
   "std_cost_eur_kg": 1.55,
   "lane": 5,
   "planned_shipment": "EXP-26-41111",
   "planned_date": "2026-09-29",
   "planned_time": "16:30",
   "customer": "Importador Francia",
   "kg": 4800
  },
  {
   "lot": "L26-263-FUS-MAI-02",
   "product": "Maíz dulce 450 g",
   "brand": "CN Frozen Foods LLC (EE. UU.)",
   "pallets": 6,
   "sku": "US-MAI-450",
   "channel": "Exportación EE. UU.",
   "kg_per_pallet": 756,
   "std_cost_eur_kg": 1.7,
   "lane": 6,
   "planned_shipment": "EXP-26-41118",
   "planned_date": "2026-09-30",
   "planned_time": "07:00",
   "customer": "CN Frozen Foods LLC (filial CN, EE. UU.)",
   "kg": 4536
  }
 ],
 "lots": {
  "L26-261-FUS-GUI-03": {
   "info": {
    "product": "Guisante fino 1 kg",
    "plant": "FUS",
    "production_date": "2026-09-18",
    "best_before": "09/2028",
    "line": "L4",
    "route": [
     "TOL-4",
     "CRB-4",
     "ENV-2",
     "DM-2"
    ],
    "shift": "mañana",
    "origin": {
     "type": "granel",
     "bulk_lot": "G26-176-FUS-GUI",
     "bulk_date": "2026-06-25",
     "bulk_line": "L2",
     "bulk_route": [
      "LIM-2",
      "DP-2",
      "ESC-2",
      "TUN-2",
      "OPT-2"
     ],
     "bulk_storage": "SIL-2",
     "harvest_date": "2026-06-25",
     "grower": "AGR-0455",
     "parcels": [
      "P-0455-02",
      "P-0455-05"
     ],
     "intake": {
      "ticket": "REC-26-09412",
      "date": "2026-06-25",
      "time": "07:18",
      "net_t": 26.1
     },
     "maturity": {
      "tenderometer_tr": 102,
      "spec": "95-120 TR"
     }
    },
    "qc": [
     "Granel de origen: tenderómetro 102 TR en recepción (especificación 95-120 TR)",
     "Reenvasado: control de peso y sellado conforme (muestreo cada 30 min)",
     "Detector de metales DM-2 verificado cada 2 h durante el turno: conforme"
    ],
    "pallets": {
     "produced": 22,
     "allocation": [
      {
       "shipment": "EXP-26-41102",
       "count": 4
      },
      {
       "location": "C-07",
       "count": 8,
       "lane": 2,
       "planned_shipment": "EXP-26-41107"
      },
      {
       "location": "SIL-3",
       "count": 10
      }
     ]
    },
    "code": "L26-261-FUS-GUI-03",
    "sku": "VL-GUI-1000",
    "product_name": "Guisante fino 1 kg",
    "brand": "Verleal (retail ES)",
    "channel": "Retail ES",
    "origin_type": "granel",
    "plant_name": "Fustiñana",
    "line_name": "Línea L4 (reenvasado desde granel)",
    "pallets_produced": 22,
    "kg_total": 17600,
    "std_value_eur": 28160.0
   },
   "back": {
    "code": "L26-261-FUS-GUI-03",
    "sku": "VL-GUI-1000",
    "product": "Guisante fino 1 kg",
    "product_name": "Guisante fino 1 kg",
    "brand": "Verleal (retail ES)",
    "plant": "FUS",
    "lot": "L26-261-FUS-GUI-03",
    "plant_name": "Fustiñana",
    "production_date": "2026-09-18",
    "best_before": "09/2028",
    "line": "L4",
    "line_name": "Línea L4 (reenvasado desde granel)",
    "shift": "mañana",
    "route": [
     {
      "code": "TOL-4",
      "name": "Volcador de octavines TOL-4",
      "short": "volcador de octavines"
     },
     {
      "code": "CRB-4",
      "name": "Criba de desterronado CRB-4",
      "short": "criba de desterronado"
     },
     {
      "code": "ENV-2",
      "name": "Envasadora retail ENV-2",
      "short": "envasado"
     },
     {
      "code": "DM-2",
      "name": "Detector de metales DM-2",
      "short": "detector de metales"
     }
    ],
    "route_text": "volcador de octavines TOL-4 → criba de desterronado CRB-4 → envasado ENV-2 → detector de metales DM-2",
    "origin_type": "granel",
    "bulk": {
     "lot": "G26-176-FUS-GUI",
     "date": "2026-06-25",
     "line": "L2",
     "route": [
      {
       "code": "LIM-2",
       "name": "Limpiadora-aventadora LIM-2",
       "short": "limpieza"
      },
      {
       "code": "DP-2",
       "name": "Despedregadora DP-2",
       "short": "despedregadora"
      },
      {
       "code": "ESC-2",
       "name": "Escaldador ESC-2",
       "short": "escaldador"
      },
      {
       "code": "TUN-2",
       "name": "Túnel IQF TUN-2",
       "short": "túnel IQF"
      },
      {
       "code": "OPT-2",
       "name": "Selectora óptica OPT-2",
       "short": "óptica"
      }
     ],
     "route_text": "limpieza LIM-2 → despedregadora DP-2 → escaldador ESC-2 → túnel IQF TUN-2 → óptica OPT-2",
     "storage": "SIL-2",
     "storage_label": "Silo automático 2 (Fustiñana)"
    },
    "components": [],
    "qc": [
     "Granel de origen: tenderómetro 102 TR en recepción (especificación 95-120 TR)",
     "Reenvasado: control de peso y sellado conforme (muestreo cada 30 min)",
     "Detector de metales DM-2 verificado cada 2 h durante el turno: conforme"
    ],
    "maintenance": [],
    "harvest_date": "2026-06-25",
    "grower": {
     "code": "AGR-0455",
     "zone": "Ribera navarra",
     "municipality": "Cortes",
     "crops": [
      "guisante"
     ],
     "contract": "Contrato de campaña 2026"
    },
    "parcels": [
     {
      "code": "P-0455-02",
      "grower": "AGR-0455",
      "municipality": "Cortes",
      "zone": "Ribera navarra",
      "crop": "guisante",
      "ha": 5.1,
      "sowing_date": "2026-03-10"
     },
     {
      "code": "P-0455-05",
      "grower": "AGR-0455",
      "municipality": "Cortes",
      "zone": "Ribera navarra",
      "crop": "guisante",
      "ha": 4.4,
      "sowing_date": "2026-03-12"
     }
    ],
    "intake": {
     "ticket": "REC-26-09412",
     "date": "2026-06-25",
     "time": "07:18",
     "net_t": 26.1
    },
    "maturity": {
     "tenderometer_tr": 102,
     "spec": "95-120 TR"
    },
    "maturity_text": "tenderómetro 102 TR",
    "summary": "Reenvasado el 2026-09-18 desde el granel G26-176-FUS-GUI: guisante de AGR-0455 (P-0455-02, P-0455-05), cosecha 2026-06-25, recepción REC-26-09412 a las 07:18",
    "transfer": null,
    "steps": [
     {
      "stage": "Campo",
      "detail": "Agricultor AGR-0455 · parcelas P-0455-02, P-0455-05 (Ribera navarra) · guisante",
      "when": "2026-06-25",
      "ref": "AGR-0455"
     },
     {
      "stage": "Recepción",
      "detail": "Ticket REC-26-09412 · tenderómetro 102 TR · 26,1 t",
      "when": "2026-06-25 07:18",
      "ref": "REC-26-09412"
     },
     {
      "stage": "Proceso de campaña (granel)",
      "detail": "Línea L2 (guisante / judía verde): limpieza LIM-2 → despedregadora DP-2 → escaldador ESC-2 → túnel IQF TUN-2 → óptica OPT-2 → granel G26-176-FUS-GUI en Silo automático 2 (Fustiñana)",
      "when": "2026-06-25",
      "ref": "G26-176-FUS-GUI"
     },
     {
      "stage": "Reenvasado",
      "detail": "Línea L4 (reenvasado desde granel): volcador de octavines TOL-4 → criba de desterronado CRB-4 → envasado ENV-2 → detector de metales DM-2 · turno mañana",
      "when": "2026-09-18",
      "ref": "L4"
     },
     {
      "stage": "Calidad",
      "detail": "Granel de origen: tenderómetro 102 TR en recepción (especificación 95-120 TR); Reenvasado: control de peso y sellado conforme (muestreo cada 30 min); Detector de metales DM-2 verificado cada 2 h durante el turno: conforme",
      "when": "2026-09-18",
      "ref": ""
     }
    ]
   },
   "forward": {
    "lot": "L26-261-FUS-GUI-03",
    "product": "Guisante fino 1 kg",
    "product_name": "Guisante fino 1 kg",
    "sku": "VL-GUI-1000",
    "brand": "Verleal (retail ES)",
    "produced_pallets": 22,
    "kg_total": 17600,
    "by_location": [
     {
      "location": "C-07",
      "pallets": 8,
      "label": "Cámara de expedición 7 (Fustiñana)",
      "lane": 2,
      "planned_shipment": "EXP-26-41107"
     },
     {
      "location": "SIL-3",
      "pallets": 10,
      "label": "Silo automático 3 (Fustiñana)",
      "lane": null,
      "planned_shipment": null
     }
    ],
    "shipments": [
     {
      "id": "EXP-26-41102",
      "pallets": 4,
      "date": "2026-09-28",
      "time": "18:40",
      "status": "expedida",
      "transport": "Camión frigorífico -25 °C",
      "dock": null,
      "end_customer": null,
      "customer": "Plataforma logística retail ES",
      "customer_id": "CLI-RET-ES"
     },
     {
      "id": "EXP-26-41107",
      "pallets": 8,
      "date": "2026-09-29",
      "time": "11:00",
      "status": "planificada",
      "transport": "Camión frigorífico -25 °C",
      "dock": "Muelle 3",
      "end_customer": null,
      "customer": "Plataforma logística retail ES",
      "customer_id": "CLI-RET-ES"
     }
    ],
    "shipped_pallets": 4,
    "stock_pallets": 18,
    "planned_pallets": 8,
    "customers": [
     "Plataforma logística retail ES"
    ],
    "transfer": null,
    "pallets": [
     {
      "sscc": "384123452610300017",
      "lot": "L26-261-FUS-GUI-03",
      "n": 1,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41102",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300024",
      "lot": "L26-261-FUS-GUI-03",
      "n": 2,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41102",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300031",
      "lot": "L26-261-FUS-GUI-03",
      "n": 3,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41102",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300048",
      "lot": "L26-261-FUS-GUI-03",
      "n": 4,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41102",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300055",
      "lot": "L26-261-FUS-GUI-03",
      "n": 5,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 1"
     },
     {
      "sscc": "384123452610300062",
      "lot": "L26-261-FUS-GUI-03",
      "n": 6,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 2"
     },
     {
      "sscc": "384123452610300079",
      "lot": "L26-261-FUS-GUI-03",
      "n": 7,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 3"
     },
     {
      "sscc": "384123452610300086",
      "lot": "L26-261-FUS-GUI-03",
      "n": 8,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 4"
     },
     {
      "sscc": "384123452610300093",
      "lot": "L26-261-FUS-GUI-03",
      "n": 9,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 5"
     },
     {
      "sscc": "384123452610300109",
      "lot": "L26-261-FUS-GUI-03",
      "n": 10,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 6"
     },
     {
      "sscc": "384123452610300116",
      "lot": "L26-261-FUS-GUI-03",
      "n": 11,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 7"
     },
     {
      "sscc": "384123452610300123",
      "lot": "L26-261-FUS-GUI-03",
      "n": 12,
      "of": 22,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 2 · hueco 8"
     },
     {
      "sscc": "384123452610300130",
      "lot": "L26-261-FUS-GUI-03",
      "n": 13,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300147",
      "lot": "L26-261-FUS-GUI-03",
      "n": 14,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300154",
      "lot": "L26-261-FUS-GUI-03",
      "n": 15,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300161",
      "lot": "L26-261-FUS-GUI-03",
      "n": 16,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300178",
      "lot": "L26-261-FUS-GUI-03",
      "n": 17,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300185",
      "lot": "L26-261-FUS-GUI-03",
      "n": 18,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300192",
      "lot": "L26-261-FUS-GUI-03",
      "n": 19,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300208",
      "lot": "L26-261-FUS-GUI-03",
      "n": 20,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300215",
      "lot": "L26-261-FUS-GUI-03",
      "n": 21,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452610300222",
      "lot": "L26-261-FUS-GUI-03",
      "n": 22,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     }
    ],
    "summary": "22 palés: 8 en C-07, 10 en SIL-3, 4 expedidos a Plataforma logística retail ES (EXP-26-41102)"
   },
   "summary": {
    "lot": "L26-261-FUS-GUI-03",
    "product": "Guisante fino 1 kg",
    "brand": "Verleal (retail ES)",
    "origin_type": "granel",
    "origin": "Reenvasado el 2026-09-18 desde el granel G26-176-FUS-GUI: guisante de AGR-0455 (P-0455-02, P-0455-05), cosecha 2026-06-25, recepción REC-26-09412 a las 07:18",
    "forward": "22 palés: 8 en C-07, 10 en SIL-3, 4 expedidos a Plataforma logística retail ES (EXP-26-41102)",
    "grower": "AGR-0455",
    "harvest_date": "2026-06-25",
    "line": "L4",
    "production_date": "2026-09-18",
    "pallets": 22,
    "by_location": {
     "C-07": 8,
     "SIL-3": 10
    },
    "shipped": 4,
    "planned": 8,
    "stock": 18,
    "shipments": [
     "EXP-26-41102",
     "EXP-26-41107"
    ],
    "customers": [
     "Plataforma logística retail ES"
    ]
   }
  },
  "L26-258-FUS-BRO-01": {
   "info": {
    "product": "Brócoli floretes 2,5 kg",
    "plant": "FUS",
    "production_date": "2026-09-15",
    "best_before": "09/2028",
    "line": "L4",
    "route": [
     "TOL-4",
     "CRB-4",
     "ENV-1",
     "DM-2"
    ],
    "shift": "tarde",
    "origin": {
     "type": "granel",
     "bulk_lot": "G26-132-FUS-BRO",
     "bulk_date": "2026-05-12",
     "bulk_line": "L3",
     "bulk_route": [
      "COR-3",
      "ESC-3",
      "TUN-1",
      "OPT-3"
     ],
     "bulk_storage": "SIL-1",
     "harvest_date": "2026-05-12",
     "grower": "AGR-0388",
     "parcels": [
      "P-0388-01"
     ],
     "intake": {
      "ticket": "REC-26-06120",
      "date": "2026-05-12",
      "time": "06:55",
      "net_t": 18.4
     },
     "maturity": {
      "note": "Cabeza compacta, sin floración; calibre de florete 30-50 mm"
     }
    },
    "qc": [
     "Floretes: calibre 30-50 mm conforme",
     "Detector de metales DM-2: verificaciones conformes"
    ],
    "pallets": {
     "produced": 18,
     "allocation": [
      {
       "location": "C-07",
       "count": 6,
       "lane": 1,
       "planned_shipment": "EXP-26-41106"
      },
      {
       "location": "SIL-1",
       "count": 12
      }
     ]
    },
    "code": "L26-258-FUS-BRO-01",
    "sku": "CN-BRO-2500",
    "product_name": "Brócoli floretes 2,5 kg",
    "brand": "CN foodservice",
    "channel": "Foodservice ES",
    "origin_type": "granel",
    "plant_name": "Fustiñana",
    "line_name": "Línea L4 (reenvasado desde granel)",
    "pallets_produced": 18,
    "kg_total": 12960,
    "std_value_eur": 22680.0
   },
   "back": {
    "code": "L26-258-FUS-BRO-01",
    "sku": "CN-BRO-2500",
    "product": "Brócoli floretes 2,5 kg",
    "product_name": "Brócoli floretes 2,5 kg",
    "brand": "CN foodservice",
    "plant": "FUS",
    "lot": "L26-258-FUS-BRO-01",
    "plant_name": "Fustiñana",
    "production_date": "2026-09-15",
    "best_before": "09/2028",
    "line": "L4",
    "line_name": "Línea L4 (reenvasado desde granel)",
    "shift": "tarde",
    "route": [
     {
      "code": "TOL-4",
      "name": "Volcador de octavines TOL-4",
      "short": "volcador de octavines"
     },
     {
      "code": "CRB-4",
      "name": "Criba de desterronado CRB-4",
      "short": "criba de desterronado"
     },
     {
      "code": "ENV-1",
      "name": "Envasadora foodservice ENV-1",
      "short": "envasado"
     },
     {
      "code": "DM-2",
      "name": "Detector de metales DM-2",
      "short": "detector de metales"
     }
    ],
    "route_text": "volcador de octavines TOL-4 → criba de desterronado CRB-4 → envasado ENV-1 → detector de metales DM-2",
    "origin_type": "granel",
    "bulk": {
     "lot": "G26-132-FUS-BRO",
     "date": "2026-05-12",
     "line": "L3",
     "route": [
      {
       "code": "COR-3",
       "name": "Despuntadora-cortadora COR-3",
       "short": "despuntadora/cortadora"
      },
      {
       "code": "ESC-3",
       "name": "Escaldador de banda ESC-3",
       "short": "escaldador"
      },
      {
       "code": "TUN-1",
       "name": "Túnel IQF TUN-1",
       "short": "túnel IQF"
      },
      {
       "code": "OPT-3",
       "name": "Selectora óptica OPT-3",
       "short": "óptica"
      }
     ],
     "route_text": "despuntadora/cortadora COR-3 → escaldador ESC-3 → túnel IQF TUN-1 → óptica OPT-3",
     "storage": "SIL-1",
     "storage_label": "Silo automático 1 (Fustiñana)"
    },
    "components": [],
    "qc": [
     "Floretes: calibre 30-50 mm conforme",
     "Detector de metales DM-2: verificaciones conformes"
    ],
    "maintenance": [],
    "harvest_date": "2026-05-12",
    "grower": {
     "code": "AGR-0388",
     "zone": "Ribera navarra",
     "municipality": "Cadreita",
     "crops": [
      "brócoli"
     ],
     "contract": "Contrato de campaña 2026"
    },
    "parcels": [
     {
      "code": "P-0388-01",
      "grower": "AGR-0388",
      "municipality": "Cadreita",
      "zone": "Ribera navarra",
      "crop": "brócoli",
      "ha": 6.0,
      "sowing_date": "2026-02-20"
     }
    ],
    "intake": {
     "ticket": "REC-26-06120",
     "date": "2026-05-12",
     "time": "06:55",
     "net_t": 18.4
    },
    "maturity": {
     "note": "Cabeza compacta, sin floración; calibre de florete 30-50 mm"
    },
    "maturity_text": "Cabeza compacta, sin floración; calibre de florete 30-50 mm",
    "summary": "Reenvasado el 2026-09-15 desde el granel G26-132-FUS-BRO: brócoli de AGR-0388 (P-0388-01), cosecha 2026-05-12, recepción REC-26-06120 a las 06:55",
    "transfer": null,
    "steps": [
     {
      "stage": "Campo",
      "detail": "Agricultor AGR-0388 · parcelas P-0388-01 (Ribera navarra) · brócoli",
      "when": "2026-05-12",
      "ref": "AGR-0388"
     },
     {
      "stage": "Recepción",
      "detail": "Ticket REC-26-06120 · Cabeza compacta, sin floración; calibre de florete 30-50 mm · 18,4 t",
      "when": "2026-05-12 06:55",
      "ref": "REC-26-06120"
     },
     {
      "stage": "Proceso de campaña (granel)",
      "detail": "Línea L3 (judía verde / brócoli): despuntadora/cortadora COR-3 → escaldador ESC-3 → túnel IQF TUN-1 → óptica OPT-3 → granel G26-132-FUS-BRO en Silo automático 1 (Fustiñana)",
      "when": "2026-05-12",
      "ref": "G26-132-FUS-BRO"
     },
     {
      "stage": "Reenvasado",
      "detail": "Línea L4 (reenvasado desde granel): volcador de octavines TOL-4 → criba de desterronado CRB-4 → envasado ENV-1 → detector de metales DM-2 · turno tarde",
      "when": "2026-09-15",
      "ref": "L4"
     },
     {
      "stage": "Calidad",
      "detail": "Floretes: calibre 30-50 mm conforme; Detector de metales DM-2: verificaciones conformes",
      "when": "2026-09-15",
      "ref": ""
     }
    ]
   },
   "forward": {
    "lot": "L26-258-FUS-BRO-01",
    "product": "Brócoli floretes 2,5 kg",
    "product_name": "Brócoli floretes 2,5 kg",
    "sku": "CN-BRO-2500",
    "brand": "CN foodservice",
    "produced_pallets": 18,
    "kg_total": 12960,
    "by_location": [
     {
      "location": "C-07",
      "pallets": 6,
      "label": "Cámara de expedición 7 (Fustiñana)",
      "lane": 1,
      "planned_shipment": "EXP-26-41106"
     },
     {
      "location": "SIL-1",
      "pallets": 12,
      "label": "Silo automático 1 (Fustiñana)",
      "lane": null,
      "planned_shipment": null
     }
    ],
    "shipments": [
     {
      "id": "EXP-26-41106",
      "pallets": 6,
      "date": "2026-09-29",
      "time": "09:30",
      "status": "planificada",
      "transport": "Camión frigorífico -25 °C",
      "dock": "Muelle 2",
      "end_customer": null,
      "customer": "Distribuidor foodservice ES (zona centro)",
      "customer_id": "CLI-FS-ES"
     }
    ],
    "shipped_pallets": 0,
    "stock_pallets": 18,
    "planned_pallets": 6,
    "customers": [
     "Distribuidor foodservice ES (zona centro)"
    ],
    "transfer": null,
    "pallets": [
     {
      "sscc": "384123452580100013",
      "lot": "L26-258-FUS-BRO-01",
      "n": 1,
      "of": 18,
      "kg": 720,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41106",
      "position": "calle 1 · hueco 1"
     },
     {
      "sscc": "384123452580100020",
      "lot": "L26-258-FUS-BRO-01",
      "n": 2,
      "of": 18,
      "kg": 720,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41106",
      "position": "calle 1 · hueco 2"
     },
     {
      "sscc": "384123452580100037",
      "lot": "L26-258-FUS-BRO-01",
      "n": 3,
      "of": 18,
      "kg": 720,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41106",
      "position": "calle 1 · hueco 3"
     },
     {
      "sscc": "384123452580100044",
      "lot": "L26-258-FUS-BRO-01",
      "n": 4,
      "of": 18,
      "kg": 720,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41106",
      "position": "calle 1 · hueco 4"
     },
     {
      "sscc": "384123452580100051",
      "lot": "L26-258-FUS-BRO-01",
      "n": 5,
      "of": 18,
      "kg": 720,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41106",
      "position": "calle 1 · hueco 5"
     },
     {
      "sscc": "384123452580100068",
      "lot": "L26-258-FUS-BRO-01",
      "n": 6,
      "of": 18,
      "kg": 720,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41106",
      "position": "calle 1 · hueco 6"
     },
     {
      "sscc": "384123452580100075",
      "lot": "L26-258-FUS-BRO-01",
      "n": 7,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100082",
      "lot": "L26-258-FUS-BRO-01",
      "n": 8,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100099",
      "lot": "L26-258-FUS-BRO-01",
      "n": 9,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100105",
      "lot": "L26-258-FUS-BRO-01",
      "n": 10,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100112",
      "lot": "L26-258-FUS-BRO-01",
      "n": 11,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100129",
      "lot": "L26-258-FUS-BRO-01",
      "n": 12,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100136",
      "lot": "L26-258-FUS-BRO-01",
      "n": 13,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100143",
      "lot": "L26-258-FUS-BRO-01",
      "n": 14,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100150",
      "lot": "L26-258-FUS-BRO-01",
      "n": 15,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100167",
      "lot": "L26-258-FUS-BRO-01",
      "n": 16,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100174",
      "lot": "L26-258-FUS-BRO-01",
      "n": 17,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452580100181",
      "lot": "L26-258-FUS-BRO-01",
      "n": 18,
      "of": 18,
      "kg": 720,
      "location": "SIL-1",
      "location_label": "Silo automático 1 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     }
    ],
    "summary": "18 palés: 6 en C-07, 12 en SIL-1"
   },
   "summary": {
    "lot": "L26-258-FUS-BRO-01",
    "product": "Brócoli floretes 2,5 kg",
    "brand": "CN foodservice",
    "origin_type": "granel",
    "origin": "Reenvasado el 2026-09-15 desde el granel G26-132-FUS-BRO: brócoli de AGR-0388 (P-0388-01), cosecha 2026-05-12, recepción REC-26-06120 a las 06:55",
    "forward": "18 palés: 6 en C-07, 12 en SIL-1",
    "grower": "AGR-0388",
    "harvest_date": "2026-05-12",
    "line": "L4",
    "production_date": "2026-09-15",
    "pallets": 18,
    "by_location": {
     "C-07": 6,
     "SIL-1": 12
    },
    "shipped": 0,
    "planned": 6,
    "stock": 18,
    "shipments": [
     "EXP-26-41106"
    ],
    "customers": [
     "Distribuidor foodservice ES (zona centro)"
    ]
   }
  },
  "L26-262-FUS-MIX-02": {
   "info": {
    "product": "Salteado de verduras a la plancha 600 g",
    "plant": "FUS",
    "production_date": "2026-09-19",
    "best_before": "09/2028",
    "line": "L5",
    "route": [
     "DOS-5",
     "MZ-5",
     "ENV-5",
     "DM-4"
    ],
    "shift": "mañana",
    "origin": {
     "type": "mezcla",
     "components": [
      {
       "name": "Pimiento rojo asado en tiras",
       "share_pct": 30,
       "bulk_lot": "G26-240-ARG-PIM",
       "plant": "ARG",
       "process_date": "2026-08-28",
       "route": [
        "GRL-1",
        "TUN-A1"
       ],
       "bulk_storage": "ARG-C3",
       "harvest_date": "2026-08-28",
       "grower": "AGR-0702",
       "parcels": [
        "P-0702-04"
       ],
       "intake": {
        "ticket": "REC-26-19905",
        "date": "2026-08-28",
        "time": "08:10",
        "net_t": 12.8
       }
      },
      {
       "name": "Calabacín a la plancha",
       "share_pct": 30,
       "bulk_lot": "G26-236-ARG-CAL",
       "plant": "ARG",
       "process_date": "2026-08-24",
       "route": [
        "GRL-1",
        "TUN-A1"
       ],
       "bulk_storage": "ARG-C3",
       "harvest_date": "2026-08-24",
       "grower": "AGR-0718",
       "parcels": [
        "P-0718-02"
       ],
       "intake": {
        "ticket": "REC-26-19511",
        "date": "2026-08-24",
        "time": "07:45",
        "net_t": 14.1
       }
      },
      {
       "name": "Berenjena a la plancha",
       "share_pct": 20,
       "bulk_lot": "G26-238-ARG-BER",
       "plant": "ARG",
       "process_date": "2026-08-26",
       "route": [
        "GRL-1",
        "TUN-A1"
       ],
       "bulk_storage": "ARG-C3",
       "harvest_date": "2026-08-26",
       "grower": "AGR-0702",
       "parcels": [
        "P-0702-06"
       ],
       "intake": {
        "ticket": "REC-26-19730",
        "date": "2026-08-26",
        "time": "09:05",
        "net_t": 9.6
       }
      },
      {
       "name": "Cebolla asada",
       "share_pct": 20,
       "bulk_lot": "G26-229-ARG-CEB",
       "plant": "ARG",
       "process_date": "2026-08-17",
       "route": [
        "GRL-1",
        "TUN-A1"
       ],
       "bulk_storage": "ARG-C3",
       "harvest_date": "2026-08-17",
       "grower": "AGR-0741",
       "parcels": [
        "P-0741-01"
       ],
       "intake": {
        "ticket": "REC-26-18010",
        "date": "2026-08-17",
        "time": "11:20",
        "net_t": 10.2
       }
      }
     ]
    },
    "qc": [
     "Receta 30/30/20/20 % verificada con la báscula de dosificación",
     "Detector de metales DM-4: verificaciones conformes",
     "Especificación del cliente UK: etiquetado en inglés verificado"
    ],
    "pallets": {
     "produced": 16,
     "allocation": [
      {
       "shipment": "EXP-26-41083",
       "count": 9
      },
      {
       "location": "C-07",
       "count": 7,
       "lane": 4,
       "planned_shipment": "EXP-26-41109"
      }
     ]
    },
    "code": "L26-262-FUS-MIX-02",
    "sku": "UK-MIX-600",
    "product_name": "Salteado de verduras a la plancha 600 g",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "channel": "Retail UK (vía Freeworld Foods)",
    "origin_type": "mezcla",
    "plant_name": "Fustiñana",
    "line_name": "Línea L5 (mezclas)",
    "pallets_produced": 16,
    "kg_total": 10368,
    "std_value_eur": 24883.2
   },
   "back": {
    "code": "L26-262-FUS-MIX-02",
    "sku": "UK-MIX-600",
    "product": "Salteado de verduras a la plancha 600 g",
    "product_name": "Salteado de verduras a la plancha 600 g",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "plant": "FUS",
    "lot": "L26-262-FUS-MIX-02",
    "plant_name": "Fustiñana",
    "production_date": "2026-09-19",
    "best_before": "09/2028",
    "line": "L5",
    "line_name": "Línea L5 (mezclas)",
    "shift": "mañana",
    "route": [
     {
      "code": "DOS-5",
      "name": "Dosificadora multicabezal DOS-5",
      "short": "dosificación"
     },
     {
      "code": "MZ-5",
      "name": "Mezcladora MZ-5",
      "short": "mezcladora"
     },
     {
      "code": "ENV-5",
      "name": "Envasadora de mezclas ENV-5",
      "short": "envasado"
     },
     {
      "code": "DM-4",
      "name": "Detector de metales DM-4",
      "short": "detector de metales"
     }
    ],
    "route_text": "dosificación DOS-5 → mezcladora MZ-5 → envasado ENV-5 → detector de metales DM-4",
    "origin_type": "mezcla",
    "bulk": null,
    "components": [
     {
      "name": "Pimiento rojo asado en tiras",
      "share_pct": 30,
      "bulk_lot": "G26-240-ARG-PIM",
      "plant": "ARG",
      "process_date": "2026-08-28",
      "route": [
       {
        "code": "GRL-1",
        "name": "Grill continuo GRL-1",
        "short": "grill (plancha)"
       },
       {
        "code": "TUN-A1",
        "name": "Túnel IQF TUN-A1",
        "short": "túnel IQF"
       }
      ],
      "bulk_storage": "ARG-C3",
      "harvest_date": "2026-08-28",
      "grower": {
       "code": "AGR-0702",
       "zone": "Ribera navarra",
       "municipality": "Arguedas",
       "crops": [
        "pimiento",
        "berenjena"
       ],
       "contract": "Contrato de campaña 2026"
      },
      "parcels": [
       {
        "code": "P-0702-04",
        "grower": "AGR-0702",
        "municipality": "Arguedas",
        "zone": "Ribera navarra",
        "crop": "pimiento",
        "ha": 2.6,
        "sowing_date": "2026-05-05"
       }
      ],
      "intake": {
       "ticket": "REC-26-19905",
       "date": "2026-08-28",
       "time": "08:10",
       "net_t": 12.8
      },
      "maturity": {},
      "maturity_text": "",
      "route_text": "grill (plancha) GRL-1 → túnel IQF TUN-A1"
     },
     {
      "name": "Calabacín a la plancha",
      "share_pct": 30,
      "bulk_lot": "G26-236-ARG-CAL",
      "plant": "ARG",
      "process_date": "2026-08-24",
      "route": [
       {
        "code": "GRL-1",
        "name": "Grill continuo GRL-1",
        "short": "grill (plancha)"
       },
       {
        "code": "TUN-A1",
        "name": "Túnel IQF TUN-A1",
        "short": "túnel IQF"
       }
      ],
      "bulk_storage": "ARG-C3",
      "harvest_date": "2026-08-24",
      "grower": {
       "code": "AGR-0718",
       "zone": "Ribera navarra",
       "municipality": "Tudela",
       "crops": [
        "calabacín"
       ],
       "contract": "Contrato de campaña 2026"
      },
      "parcels": [
       {
        "code": "P-0718-02",
        "grower": "AGR-0718",
        "municipality": "Tudela",
        "zone": "Ribera navarra",
        "crop": "calabacín",
        "ha": 2.2,
        "sowing_date": "2026-06-10"
       }
      ],
      "intake": {
       "ticket": "REC-26-19511",
       "date": "2026-08-24",
       "time": "07:45",
       "net_t": 14.1
      },
      "maturity": {},
      "maturity_text": "",
      "route_text": "grill (plancha) GRL-1 → túnel IQF TUN-A1"
     },
     {
      "name": "Berenjena a la plancha",
      "share_pct": 20,
      "bulk_lot": "G26-238-ARG-BER",
      "plant": "ARG",
      "process_date": "2026-08-26",
      "route": [
       {
        "code": "GRL-1",
        "name": "Grill continuo GRL-1",
        "short": "grill (plancha)"
       },
       {
        "code": "TUN-A1",
        "name": "Túnel IQF TUN-A1",
        "short": "túnel IQF"
       }
      ],
      "bulk_storage": "ARG-C3",
      "harvest_date": "2026-08-26",
      "grower": {
       "code": "AGR-0702",
       "zone": "Ribera navarra",
       "municipality": "Arguedas",
       "crops": [
        "pimiento",
        "berenjena"
       ],
       "contract": "Contrato de campaña 2026"
      },
      "parcels": [
       {
        "code": "P-0702-06",
        "grower": "AGR-0702",
        "municipality": "Arguedas",
        "zone": "Ribera navarra",
        "crop": "berenjena",
        "ha": 1.9,
        "sowing_date": "2026-05-08"
       }
      ],
      "intake": {
       "ticket": "REC-26-19730",
       "date": "2026-08-26",
       "time": "09:05",
       "net_t": 9.6
      },
      "maturity": {},
      "maturity_text": "",
      "route_text": "grill (plancha) GRL-1 → túnel IQF TUN-A1"
     },
     {
      "name": "Cebolla asada",
      "share_pct": 20,
      "bulk_lot": "G26-229-ARG-CEB",
      "plant": "ARG",
      "process_date": "2026-08-17",
      "route": [
       {
        "code": "GRL-1",
        "name": "Grill continuo GRL-1",
        "short": "grill (plancha)"
       },
       {
        "code": "TUN-A1",
        "name": "Túnel IQF TUN-A1",
        "short": "túnel IQF"
       }
      ],
      "bulk_storage": "ARG-C3",
      "harvest_date": "2026-08-17",
      "grower": {
       "code": "AGR-0741",
       "zone": "Ribera navarra",
       "municipality": "Cabanillas",
       "crops": [
        "cebolla"
       ],
       "contract": "Contrato de campaña 2026"
      },
      "parcels": [
       {
        "code": "P-0741-01",
        "grower": "AGR-0741",
        "municipality": "Cabanillas",
        "zone": "Ribera navarra",
        "crop": "cebolla",
        "ha": 3.0,
        "sowing_date": "2026-03-01"
       }
      ],
      "intake": {
       "ticket": "REC-26-18010",
       "date": "2026-08-17",
       "time": "11:20",
       "net_t": 10.2
      },
      "maturity": {},
      "maturity_text": "",
      "route_text": "grill (plancha) GRL-1 → túnel IQF TUN-A1"
     }
    ],
    "qc": [
     "Receta 30/30/20/20 % verificada con la báscula de dosificación",
     "Detector de metales DM-4: verificaciones conformes",
     "Especificación del cliente UK: etiquetado en inglés verificado"
    ],
    "maintenance": [],
    "summary": "Mezcla de 4 componentes (pimiento rojo asado en tiras, calabacín a la plancha, berenjena a la plancha, cebolla asada) envasada el 2026-09-19 en L5",
    "transfer": null,
    "steps": [
     {
      "stage": "Componente",
      "detail": "Pimiento rojo asado en tiras (30 %) · granel G26-240-ARG-PIM · Arguedas: grill (plancha) GRL-1 → túnel IQF TUN-A1 · agricultor AGR-0702 (P-0702-04)",
      "when": "2026-08-28",
      "ref": "G26-240-ARG-PIM"
     },
     {
      "stage": "Componente",
      "detail": "Calabacín a la plancha (30 %) · granel G26-236-ARG-CAL · Arguedas: grill (plancha) GRL-1 → túnel IQF TUN-A1 · agricultor AGR-0718 (P-0718-02)",
      "when": "2026-08-24",
      "ref": "G26-236-ARG-CAL"
     },
     {
      "stage": "Componente",
      "detail": "Berenjena a la plancha (20 %) · granel G26-238-ARG-BER · Arguedas: grill (plancha) GRL-1 → túnel IQF TUN-A1 · agricultor AGR-0702 (P-0702-06)",
      "when": "2026-08-26",
      "ref": "G26-238-ARG-BER"
     },
     {
      "stage": "Componente",
      "detail": "Cebolla asada (20 %) · granel G26-229-ARG-CEB · Arguedas: grill (plancha) GRL-1 → túnel IQF TUN-A1 · agricultor AGR-0741 (P-0741-01)",
      "when": "2026-08-17",
      "ref": "G26-229-ARG-CEB"
     },
     {
      "stage": "Mezcla y envasado",
      "detail": "Línea L5 (mezclas): dosificación DOS-5 → mezcladora MZ-5 → envasado ENV-5 → detector de metales DM-4 · turno mañana",
      "when": "2026-09-19",
      "ref": "L5"
     },
     {
      "stage": "Calidad",
      "detail": "Receta 30/30/20/20 % verificada con la báscula de dosificación; Detector de metales DM-4: verificaciones conformes; Especificación del cliente UK: etiquetado en inglés verificado",
      "when": "2026-09-19",
      "ref": ""
     }
    ]
   },
   "forward": {
    "lot": "L26-262-FUS-MIX-02",
    "product": "Salteado de verduras a la plancha 600 g",
    "product_name": "Salteado de verduras a la plancha 600 g",
    "sku": "UK-MIX-600",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "produced_pallets": 16,
    "kg_total": 10368,
    "by_location": [
     {
      "location": "C-07",
      "pallets": 7,
      "label": "Cámara de expedición 7 (Fustiñana)",
      "lane": 4,
      "planned_shipment": "EXP-26-41109"
     }
    ],
    "shipments": [
     {
      "id": "EXP-26-41083",
      "pallets": 9,
      "date": "2026-09-25",
      "time": "14:20",
      "status": "expedida",
      "transport": "Camión frigorífico -25 °C",
      "dock": null,
      "end_customer": "Retailer UK (marca blanca)",
      "customer": "Freeworld Foods Ltd (filial CN, Reino Unido)",
      "customer_id": "CLI-FWF-UK"
     },
     {
      "id": "EXP-26-41109",
      "pallets": 7,
      "date": "2026-09-29",
      "time": "14:00",
      "status": "planificada",
      "transport": "Camión frigorífico -25 °C",
      "dock": "Muelle 4",
      "end_customer": "Retailer UK (marca blanca)",
      "customer": "Freeworld Foods Ltd (filial CN, Reino Unido)",
      "customer_id": "CLI-FWF-UK"
     }
    ],
    "shipped_pallets": 9,
    "stock_pallets": 7,
    "planned_pallets": 7,
    "customers": [
     "Freeworld Foods Ltd (filial CN, Reino Unido)"
    ],
    "transfer": null,
    "pallets": [
     {
      "sscc": "384123452620200017",
      "lot": "L26-262-FUS-MIX-02",
      "n": 1,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200024",
      "lot": "L26-262-FUS-MIX-02",
      "n": 2,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200031",
      "lot": "L26-262-FUS-MIX-02",
      "n": 3,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200048",
      "lot": "L26-262-FUS-MIX-02",
      "n": 4,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200055",
      "lot": "L26-262-FUS-MIX-02",
      "n": 5,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200062",
      "lot": "L26-262-FUS-MIX-02",
      "n": 6,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200079",
      "lot": "L26-262-FUS-MIX-02",
      "n": 7,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200086",
      "lot": "L26-262-FUS-MIX-02",
      "n": 8,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200093",
      "lot": "L26-262-FUS-MIX-02",
      "n": 9,
      "of": 16,
      "kg": 648,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41083",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452620200109",
      "lot": "L26-262-FUS-MIX-02",
      "n": 10,
      "of": 16,
      "kg": 648,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41109",
      "position": "calle 4 · hueco 1"
     },
     {
      "sscc": "384123452620200116",
      "lot": "L26-262-FUS-MIX-02",
      "n": 11,
      "of": 16,
      "kg": 648,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41109",
      "position": "calle 4 · hueco 2"
     },
     {
      "sscc": "384123452620200123",
      "lot": "L26-262-FUS-MIX-02",
      "n": 12,
      "of": 16,
      "kg": 648,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41109",
      "position": "calle 4 · hueco 3"
     },
     {
      "sscc": "384123452620200130",
      "lot": "L26-262-FUS-MIX-02",
      "n": 13,
      "of": 16,
      "kg": 648,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41109",
      "position": "calle 4 · hueco 4"
     },
     {
      "sscc": "384123452620200147",
      "lot": "L26-262-FUS-MIX-02",
      "n": 14,
      "of": 16,
      "kg": 648,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41109",
      "position": "calle 4 · hueco 5"
     },
     {
      "sscc": "384123452620200154",
      "lot": "L26-262-FUS-MIX-02",
      "n": 15,
      "of": 16,
      "kg": 648,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41109",
      "position": "calle 4 · hueco 6"
     },
     {
      "sscc": "384123452620200161",
      "lot": "L26-262-FUS-MIX-02",
      "n": 16,
      "of": 16,
      "kg": 648,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41109",
      "position": "calle 4 · hueco 7"
     }
    ],
    "summary": "16 palés: 7 en C-07, 9 expedidos a Freeworld Foods Ltd (filial CN, Reino Unido) (EXP-26-41083)"
   },
   "summary": {
    "lot": "L26-262-FUS-MIX-02",
    "product": "Salteado de verduras a la plancha 600 g",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "origin_type": "mezcla",
    "origin": "Mezcla de 4 componentes (pimiento rojo asado en tiras, calabacín a la plancha, berenjena a la plancha, cebolla asada) envasada el 2026-09-19 en L5",
    "forward": "16 palés: 7 en C-07, 9 expedidos a Freeworld Foods Ltd (filial CN, Reino Unido) (EXP-26-41083)",
    "grower": null,
    "harvest_date": null,
    "line": "L5",
    "production_date": "2026-09-19",
    "pallets": 16,
    "by_location": {
     "C-07": 7
    },
    "shipped": 9,
    "planned": 7,
    "stock": 7,
    "shipments": [
     "EXP-26-41083",
     "EXP-26-41109"
    ],
    "customers": [
     "Freeworld Foods Ltd (filial CN, Reino Unido)"
    ]
   }
  },
  "L26-255-ALF-ESP-04": {
   "info": {
    "product": "Espinaca en porciones 1 kg",
    "plant": "ALF",
    "production_date": "2026-09-12",
    "best_before": "09/2028",
    "line": "ALF-L2",
    "route": [
     "ENV-A2",
     "DM-A1"
    ],
    "shift": "mañana",
    "transfer": "TRF-26-3310",
    "origin": {
     "type": "granel",
     "bulk_lot": "G26-098-ALF-ESP",
     "bulk_date": "2026-04-08",
     "bulk_line": "ALF-L1",
     "bulk_route": [
      "LAV-A1",
      "ESC-A1",
      "PRT-A1",
      "TUN-A2"
     ],
     "bulk_storage": "ALF-C1",
     "harvest_date": "2026-04-08",
     "grower": "AGR-0291",
     "parcels": [
      "P-0291-03"
     ],
     "intake": {
      "ticket": "REC-26-04877",
      "date": "2026-04-08",
      "time": "08:30",
      "net_t": 15.2
     },
     "maturity": {
      "note": "Hoja entera, sin espigado"
     }
    },
    "qc": [
     "Porciones: peso medio conforme",
     "Detector de metales DM-A1: verificaciones conformes"
    ],
    "pallets": {
     "produced": 12,
     "allocation": [
      {
       "location": "C-07",
       "count": 5,
       "lane": 3,
       "planned_shipment": "EXP-26-41107"
      },
      {
       "location": "SIL-2",
       "count": 7
      }
     ]
    },
    "code": "L26-255-ALF-ESP-04",
    "sku": "VL-ESP-1000",
    "product_name": "Espinaca en porciones 1 kg",
    "brand": "Verleal",
    "channel": "Retail ES",
    "origin_type": "granel",
    "plant_name": "Alcorioja",
    "line_name": "Línea de envasado L2 (Alcorioja)",
    "pallets_produced": 12,
    "kg_total": 9600,
    "std_value_eur": 14400.0
   },
   "back": {
    "code": "L26-255-ALF-ESP-04",
    "sku": "VL-ESP-1000",
    "product": "Espinaca en porciones 1 kg",
    "product_name": "Espinaca en porciones 1 kg",
    "brand": "Verleal",
    "plant": "ALF",
    "lot": "L26-255-ALF-ESP-04",
    "plant_name": "Alcorioja",
    "production_date": "2026-09-12",
    "best_before": "09/2028",
    "line": "ALF-L2",
    "line_name": "Línea de envasado L2 (Alcorioja)",
    "shift": "mañana",
    "route": [
     {
      "code": "ENV-A2",
      "name": "Envasadora ENV-A2",
      "short": "envasado"
     },
     {
      "code": "DM-A1",
      "name": "Detector de metales DM-A1",
      "short": "detector de metales"
     }
    ],
    "route_text": "envasado ENV-A2 → detector de metales DM-A1",
    "origin_type": "granel",
    "bulk": {
     "lot": "G26-098-ALF-ESP",
     "date": "2026-04-08",
     "line": "ALF-L1",
     "route": [
      {
       "code": "LAV-A1",
       "name": "Lavadora de hoja LAV-A1",
       "short": "lavadora"
      },
      {
       "code": "ESC-A1",
       "name": "Escaldador ESC-A1",
       "short": "escaldador"
      },
      {
       "code": "PRT-A1",
       "name": "Porcionadora de espinaca PRT-A1",
       "short": "porcionadora"
      },
      {
       "code": "TUN-A2",
       "name": "Túnel IQF TUN-A2",
       "short": "túnel IQF"
      }
     ],
     "route_text": "lavadora LAV-A1 → escaldador ESC-A1 → porcionadora PRT-A1 → túnel IQF TUN-A2",
     "storage": "ALF-C1",
     "storage_label": "Cámara de granel 1 (Alcorioja)"
    },
    "components": [],
    "qc": [
     "Porciones: peso medio conforme",
     "Detector de metales DM-A1: verificaciones conformes"
    ],
    "maintenance": [],
    "harvest_date": "2026-04-08",
    "grower": {
     "code": "AGR-0291",
     "zone": "Rioja Baja",
     "municipality": "Alfaro",
     "crops": [
      "espinaca"
     ],
     "contract": "Contrato de campaña 2026"
    },
    "parcels": [
     {
      "code": "P-0291-03",
      "grower": "AGR-0291",
      "municipality": "Alfaro",
      "zone": "Rioja Baja",
      "crop": "espinaca",
      "ha": 3.8,
      "sowing_date": "2026-02-15"
     }
    ],
    "intake": {
     "ticket": "REC-26-04877",
     "date": "2026-04-08",
     "time": "08:30",
     "net_t": 15.2
    },
    "maturity": {
     "note": "Hoja entera, sin espigado"
    },
    "maturity_text": "Hoja entera, sin espigado",
    "summary": "Reenvasado el 2026-09-12 desde el granel G26-098-ALF-ESP: espinaca de AGR-0291 (P-0291-03), cosecha 2026-04-08, recepción REC-26-04877 a las 08:30",
    "transfer": {
     "code": "TRF-26-3310",
     "date": "2026-09-14",
     "time": "12:15",
     "from_plant": "ALF",
     "to_plant": "FUS",
     "lot": "L26-255-ALF-ESP-04",
     "pallets": 12,
     "transport": "Camión frigorífico -25 °C"
    },
    "steps": [
     {
      "stage": "Campo",
      "detail": "Agricultor AGR-0291 · parcelas P-0291-03 (Rioja Baja) · espinaca",
      "when": "2026-04-08",
      "ref": "AGR-0291"
     },
     {
      "stage": "Recepción",
      "detail": "Ticket REC-26-04877 · Hoja entera, sin espigado · 15,2 t",
      "when": "2026-04-08 08:30",
      "ref": "REC-26-04877"
     },
     {
      "stage": "Proceso de campaña (granel)",
      "detail": "Línea de hoja L1 (Alcorioja): lavadora LAV-A1 → escaldador ESC-A1 → porcionadora PRT-A1 → túnel IQF TUN-A2 → granel G26-098-ALF-ESP en Cámara de granel 1 (Alcorioja)",
      "when": "2026-04-08",
      "ref": "G26-098-ALF-ESP"
     },
     {
      "stage": "Reenvasado",
      "detail": "Línea de envasado L2 (Alcorioja): envasado ENV-A2 → detector de metales DM-A1 · turno mañana",
      "when": "2026-09-12",
      "ref": "ALF-L2"
     },
     {
      "stage": "Transferencia",
      "detail": "ALF → FUS · 12 palés · Camión frigorífico -25 °C",
      "when": "2026-09-14",
      "ref": "TRF-26-3310"
     },
     {
      "stage": "Calidad",
      "detail": "Porciones: peso medio conforme; Detector de metales DM-A1: verificaciones conformes",
      "when": "2026-09-12",
      "ref": ""
     }
    ]
   },
   "forward": {
    "lot": "L26-255-ALF-ESP-04",
    "product": "Espinaca en porciones 1 kg",
    "product_name": "Espinaca en porciones 1 kg",
    "sku": "VL-ESP-1000",
    "brand": "Verleal",
    "produced_pallets": 12,
    "kg_total": 9600,
    "by_location": [
     {
      "location": "C-07",
      "pallets": 5,
      "label": "Cámara de expedición 7 (Fustiñana)",
      "lane": 3,
      "planned_shipment": "EXP-26-41107"
     },
     {
      "location": "SIL-2",
      "pallets": 7,
      "label": "Silo automático 2 (Fustiñana)",
      "lane": null,
      "planned_shipment": null
     }
    ],
    "shipments": [
     {
      "id": "EXP-26-41107",
      "pallets": 5,
      "date": "2026-09-29",
      "time": "11:00",
      "status": "planificada",
      "transport": "Camión frigorífico -25 °C",
      "dock": "Muelle 3",
      "end_customer": null,
      "customer": "Plataforma logística retail ES",
      "customer_id": "CLI-RET-ES"
     }
    ],
    "shipped_pallets": 0,
    "stock_pallets": 12,
    "planned_pallets": 5,
    "customers": [
     "Plataforma logística retail ES"
    ],
    "transfer": {
     "code": "TRF-26-3310",
     "date": "2026-09-14",
     "time": "12:15",
     "from_plant": "ALF",
     "to_plant": "FUS",
     "lot": "L26-255-ALF-ESP-04",
     "pallets": 12,
     "transport": "Camión frigorífico -25 °C"
    },
    "pallets": [
     {
      "sscc": "384123452550400013",
      "lot": "L26-255-ALF-ESP-04",
      "n": 1,
      "of": 12,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 3 · hueco 1"
     },
     {
      "sscc": "384123452550400020",
      "lot": "L26-255-ALF-ESP-04",
      "n": 2,
      "of": 12,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 3 · hueco 2"
     },
     {
      "sscc": "384123452550400037",
      "lot": "L26-255-ALF-ESP-04",
      "n": 3,
      "of": 12,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 3 · hueco 3"
     },
     {
      "sscc": "384123452550400044",
      "lot": "L26-255-ALF-ESP-04",
      "n": 4,
      "of": 12,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 3 · hueco 4"
     },
     {
      "sscc": "384123452550400051",
      "lot": "L26-255-ALF-ESP-04",
      "n": 5,
      "of": 12,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41107",
      "position": "calle 3 · hueco 5"
     },
     {
      "sscc": "384123452550400068",
      "lot": "L26-255-ALF-ESP-04",
      "n": 6,
      "of": 12,
      "kg": 800,
      "location": "SIL-2",
      "location_label": "Silo automático 2 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452550400075",
      "lot": "L26-255-ALF-ESP-04",
      "n": 7,
      "of": 12,
      "kg": 800,
      "location": "SIL-2",
      "location_label": "Silo automático 2 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452550400082",
      "lot": "L26-255-ALF-ESP-04",
      "n": 8,
      "of": 12,
      "kg": 800,
      "location": "SIL-2",
      "location_label": "Silo automático 2 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452550400099",
      "lot": "L26-255-ALF-ESP-04",
      "n": 9,
      "of": 12,
      "kg": 800,
      "location": "SIL-2",
      "location_label": "Silo automático 2 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452550400105",
      "lot": "L26-255-ALF-ESP-04",
      "n": 10,
      "of": 12,
      "kg": 800,
      "location": "SIL-2",
      "location_label": "Silo automático 2 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452550400112",
      "lot": "L26-255-ALF-ESP-04",
      "n": 11,
      "of": 12,
      "kg": 800,
      "location": "SIL-2",
      "location_label": "Silo automático 2 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452550400129",
      "lot": "L26-255-ALF-ESP-04",
      "n": 12,
      "of": 12,
      "kg": 800,
      "location": "SIL-2",
      "location_label": "Silo automático 2 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     }
    ],
    "summary": "12 palés: 5 en C-07, 7 en SIL-2"
   },
   "summary": {
    "lot": "L26-255-ALF-ESP-04",
    "product": "Espinaca en porciones 1 kg",
    "brand": "Verleal",
    "origin_type": "granel",
    "origin": "Reenvasado el 2026-09-12 desde el granel G26-098-ALF-ESP: espinaca de AGR-0291 (P-0291-03), cosecha 2026-04-08, recepción REC-26-04877 a las 08:30",
    "forward": "12 palés: 5 en C-07, 7 en SIL-2",
    "grower": "AGR-0291",
    "harvest_date": "2026-04-08",
    "line": "ALF-L2",
    "production_date": "2026-09-12",
    "pallets": 12,
    "by_location": {
     "C-07": 5,
     "SIL-2": 7
    },
    "shipped": 0,
    "planned": 5,
    "stock": 12,
    "shipments": [
     "EXP-26-41107"
    ],
    "customers": [
     "Plataforma logística retail ES"
    ]
   }
  },
  "L26-259-FUS-JUD-01": {
   "info": {
    "product": "Judía verde redonda 1 kg",
    "plant": "FUS",
    "production_date": "2026-09-16",
    "best_before": "09/2028",
    "line": "L3",
    "route": [
     "LIM-3",
     "COR-3",
     "ESC-3",
     "TUN-2",
     "OPT-3",
     "ENV-3"
    ],
    "shift": "tarde",
    "origin": {
     "type": "campo",
     "harvest_date": "2026-09-16",
     "grower": "AGR-0527",
     "parcels": [
      "P-0527-03"
     ],
     "intake": {
      "ticket": "REC-26-21045",
      "date": "2026-09-16",
      "time": "15:20",
      "net_t": 21.8
     },
     "maturity": {
      "index": 0.83,
      "spec": "0,75-0,92",
      "note": "Vaina redonda de 7-8 mm, sin hilos"
     }
    },
    "qc": [
     "Recepción: índice de madurez 0,83 (óptimo 0,75-0,92)",
     "Ensayo de peroxidasa tras el escaldado: negativo (conforme)",
     "Selectora óptica OPT-3: rechazo del 1,2 %"
    ],
    "pallets": {
     "produced": 20,
     "allocation": [
      {
       "shipment": "EXP-26-41071",
       "count": 14
      },
      {
       "location": "C-07",
       "count": 6,
       "lane": 5,
       "planned_shipment": "EXP-26-41111"
      }
     ]
    },
    "code": "L26-259-FUS-JUD-01",
    "sku": "FR-JUD-1000",
    "product_name": "Judía verde redonda 1 kg",
    "brand": "Importador Francia",
    "channel": "Exportación Francia",
    "origin_type": "campo",
    "plant_name": "Fustiñana",
    "line_name": "Línea L3 (judía verde / brócoli)",
    "pallets_produced": 20,
    "kg_total": 16000,
    "std_value_eur": 24800.0
   },
   "back": {
    "code": "L26-259-FUS-JUD-01",
    "sku": "FR-JUD-1000",
    "product": "Judía verde redonda 1 kg",
    "product_name": "Judía verde redonda 1 kg",
    "brand": "Importador Francia",
    "plant": "FUS",
    "lot": "L26-259-FUS-JUD-01",
    "plant_name": "Fustiñana",
    "production_date": "2026-09-16",
    "best_before": "09/2028",
    "line": "L3",
    "line_name": "Línea L3 (judía verde / brócoli)",
    "shift": "tarde",
    "route": [
     {
      "code": "LIM-3",
      "name": "Limpiadora LIM-3",
      "short": "limpieza"
     },
     {
      "code": "COR-3",
      "name": "Despuntadora-cortadora COR-3",
      "short": "despuntadora/cortadora"
     },
     {
      "code": "ESC-3",
      "name": "Escaldador de banda ESC-3",
      "short": "escaldador"
     },
     {
      "code": "TUN-2",
      "name": "Túnel IQF TUN-2",
      "short": "túnel IQF"
     },
     {
      "code": "OPT-3",
      "name": "Selectora óptica OPT-3",
      "short": "óptica"
     },
     {
      "code": "ENV-3",
      "name": "Envasadora ENV-3",
      "short": "envasado"
     }
    ],
    "route_text": "limpieza LIM-3 → despuntadora/cortadora COR-3 → escaldador ESC-3 → túnel IQF TUN-2 → óptica OPT-3 → envasado ENV-3",
    "origin_type": "campo",
    "bulk": null,
    "components": [],
    "qc": [
     "Recepción: índice de madurez 0,83 (óptimo 0,75-0,92)",
     "Ensayo de peroxidasa tras el escaldado: negativo (conforme)",
     "Selectora óptica OPT-3: rechazo del 1,2 %"
    ],
    "maintenance": [],
    "harvest_date": "2026-09-16",
    "grower": {
     "code": "AGR-0527",
     "zone": "Ribera navarra",
     "municipality": "Castejón",
     "crops": [
      "judía verde"
     ],
     "contract": "Contrato de campaña 2026"
    },
    "parcels": [
     {
      "code": "P-0527-03",
      "grower": "AGR-0527",
      "municipality": "Castejón",
      "zone": "Ribera navarra",
      "crop": "judía verde",
      "ha": 5.5,
      "sowing_date": "2026-07-01"
     }
    ],
    "intake": {
     "ticket": "REC-26-21045",
     "date": "2026-09-16",
     "time": "15:20",
     "net_t": 21.8
    },
    "maturity": {
     "index": 0.83,
     "spec": "0,75-0,92",
     "note": "Vaina redonda de 7-8 mm, sin hilos"
    },
    "maturity_text": "índice de madurez 0,83",
    "summary": "Judía verde de AGR-0527 (P-0527-03, Ribera navarra), cosecha 2026-09-16, recepción REC-26-21045 a las 15:20 (índice de madurez 0,83), L3 turno tarde",
    "transfer": null,
    "steps": [
     {
      "stage": "Campo",
      "detail": "Agricultor AGR-0527 · parcelas P-0527-03 (Ribera navarra) · judía verde",
      "when": "2026-09-16",
      "ref": "AGR-0527"
     },
     {
      "stage": "Recepción",
      "detail": "Ticket REC-26-21045 · índice de madurez 0,83 · 21,8 t",
      "when": "2026-09-16 15:20",
      "ref": "REC-26-21045"
     },
     {
      "stage": "Proceso",
      "detail": "Línea L3 (judía verde / brócoli): limpieza LIM-3 → despuntadora/cortadora COR-3 → escaldador ESC-3 → túnel IQF TUN-2 → óptica OPT-3 → envasado ENV-3 · turno tarde",
      "when": "2026-09-16",
      "ref": "L3"
     },
     {
      "stage": "Calidad",
      "detail": "Recepción: índice de madurez 0,83 (óptimo 0,75-0,92); Ensayo de peroxidasa tras el escaldado: negativo (conforme); Selectora óptica OPT-3: rechazo del 1,2 %",
      "when": "2026-09-16",
      "ref": ""
     }
    ]
   },
   "forward": {
    "lot": "L26-259-FUS-JUD-01",
    "product": "Judía verde redonda 1 kg",
    "product_name": "Judía verde redonda 1 kg",
    "sku": "FR-JUD-1000",
    "brand": "Importador Francia",
    "produced_pallets": 20,
    "kg_total": 16000,
    "by_location": [
     {
      "location": "C-07",
      "pallets": 6,
      "label": "Cámara de expedición 7 (Fustiñana)",
      "lane": 5,
      "planned_shipment": "EXP-26-41111"
     }
    ],
    "shipments": [
     {
      "id": "EXP-26-41071",
      "pallets": 14,
      "date": "2026-09-23",
      "time": "17:45",
      "status": "expedida",
      "transport": "Camión frigorífico -25 °C",
      "dock": null,
      "end_customer": null,
      "customer": "Importador Francia",
      "customer_id": "CLI-IMP-FR"
     },
     {
      "id": "EXP-26-41111",
      "pallets": 6,
      "date": "2026-09-29",
      "time": "16:30",
      "status": "planificada",
      "transport": "Camión frigorífico -25 °C",
      "dock": "Muelle 5",
      "end_customer": null,
      "customer": "Importador Francia",
      "customer_id": "CLI-IMP-FR"
     }
    ],
    "shipped_pallets": 14,
    "stock_pallets": 6,
    "planned_pallets": 6,
    "customers": [
     "Importador Francia"
    ],
    "transfer": null,
    "pallets": [
     {
      "sscc": "384123452590100010",
      "lot": "L26-259-FUS-JUD-01",
      "n": 1,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100027",
      "lot": "L26-259-FUS-JUD-01",
      "n": 2,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100034",
      "lot": "L26-259-FUS-JUD-01",
      "n": 3,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100041",
      "lot": "L26-259-FUS-JUD-01",
      "n": 4,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100058",
      "lot": "L26-259-FUS-JUD-01",
      "n": 5,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100065",
      "lot": "L26-259-FUS-JUD-01",
      "n": 6,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100072",
      "lot": "L26-259-FUS-JUD-01",
      "n": 7,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100089",
      "lot": "L26-259-FUS-JUD-01",
      "n": 8,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100096",
      "lot": "L26-259-FUS-JUD-01",
      "n": 9,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100102",
      "lot": "L26-259-FUS-JUD-01",
      "n": 10,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100119",
      "lot": "L26-259-FUS-JUD-01",
      "n": 11,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100126",
      "lot": "L26-259-FUS-JUD-01",
      "n": 12,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100133",
      "lot": "L26-259-FUS-JUD-01",
      "n": 13,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100140",
      "lot": "L26-259-FUS-JUD-01",
      "n": 14,
      "of": 20,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-41071",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452590100157",
      "lot": "L26-259-FUS-JUD-01",
      "n": 15,
      "of": 20,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41111",
      "position": "calle 5 · hueco 1"
     },
     {
      "sscc": "384123452590100164",
      "lot": "L26-259-FUS-JUD-01",
      "n": 16,
      "of": 20,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41111",
      "position": "calle 5 · hueco 2"
     },
     {
      "sscc": "384123452590100171",
      "lot": "L26-259-FUS-JUD-01",
      "n": 17,
      "of": 20,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41111",
      "position": "calle 5 · hueco 3"
     },
     {
      "sscc": "384123452590100188",
      "lot": "L26-259-FUS-JUD-01",
      "n": 18,
      "of": 20,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41111",
      "position": "calle 5 · hueco 4"
     },
     {
      "sscc": "384123452590100195",
      "lot": "L26-259-FUS-JUD-01",
      "n": 19,
      "of": 20,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41111",
      "position": "calle 5 · hueco 5"
     },
     {
      "sscc": "384123452590100201",
      "lot": "L26-259-FUS-JUD-01",
      "n": 20,
      "of": 20,
      "kg": 800,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41111",
      "position": "calle 5 · hueco 6"
     }
    ],
    "summary": "20 palés: 6 en C-07, 14 expedidos a Importador Francia (EXP-26-41071)"
   },
   "summary": {
    "lot": "L26-259-FUS-JUD-01",
    "product": "Judía verde redonda 1 kg",
    "brand": "Importador Francia",
    "origin_type": "campo",
    "origin": "Judía verde de AGR-0527 (P-0527-03, Ribera navarra), cosecha 2026-09-16, recepción REC-26-21045 a las 15:20 (índice de madurez 0,83), L3 turno tarde",
    "forward": "20 palés: 6 en C-07, 14 expedidos a Importador Francia (EXP-26-41071)",
    "grower": "AGR-0527",
    "harvest_date": "2026-09-16",
    "line": "L3",
    "production_date": "2026-09-16",
    "pallets": 20,
    "by_location": {
     "C-07": 6
    },
    "shipped": 14,
    "planned": 6,
    "stock": 6,
    "shipments": [
     "EXP-26-41071",
     "EXP-26-41111"
    ],
    "customers": [
     "Importador Francia"
    ]
   }
  },
  "L26-263-FUS-MAI-02": {
   "info": {
    "product": "Maíz dulce 450 g",
    "plant": "FUS",
    "production_date": "2026-09-20",
    "best_before": "09/2028",
    "line": "L1",
    "route": [
     "DES-1",
     "LAV-1",
     "ESC-1",
     "TUN-1",
     "OPT-1",
     "ENV-3",
     "DM-1"
    ],
    "shift": "mañana",
    "origin": {
     "type": "campo",
     "harvest_date": "2026-09-20",
     "grower": "AGR-0613",
     "parcels": [
      "P-0613-11",
      "P-0613-12"
     ],
     "intake": {
      "ticket": "REC-26-21390",
      "date": "2026-09-20",
      "time": "06:40",
      "net_t": 32.5
     },
     "maturity": {
      "index": 0.88,
      "spec": "0,80-0,95",
      "brix": 15.1,
      "note": "Grano en estado lechoso-pastoso"
     }
    },
    "qc": [
     "Recepción: índice de madurez 0,88 (óptimo 0,80-0,95), 15,1 °Brix",
     "Detector de metales DM-1 (PCC): verificaciones cada 2 h conformes ese día",
     "Etiquetado EE. UU. (inglés, 16 oz) verificado"
    ],
    "pallets": {
     "produced": 24,
     "allocation": [
      {
       "location": "C-07",
       "count": 6,
       "lane": 6,
       "planned_shipment": "EXP-26-41118"
      },
      {
       "location": "SIL-4",
       "count": 18
      }
     ]
    },
    "code": "L26-263-FUS-MAI-02",
    "sku": "US-MAI-450",
    "product_name": "Maíz dulce 450 g",
    "brand": "CN Frozen Foods LLC (EE. UU.)",
    "channel": "Exportación EE. UU.",
    "origin_type": "campo",
    "plant_name": "Fustiñana",
    "line_name": "Línea L1 (maíz dulce)",
    "pallets_produced": 24,
    "kg_total": 18144,
    "std_value_eur": 30844.8
   },
   "back": {
    "code": "L26-263-FUS-MAI-02",
    "sku": "US-MAI-450",
    "product": "Maíz dulce 450 g",
    "product_name": "Maíz dulce 450 g",
    "brand": "CN Frozen Foods LLC (EE. UU.)",
    "plant": "FUS",
    "lot": "L26-263-FUS-MAI-02",
    "plant_name": "Fustiñana",
    "production_date": "2026-09-20",
    "best_before": "09/2028",
    "line": "L1",
    "line_name": "Línea L1 (maíz dulce)",
    "shift": "mañana",
    "route": [
     {
      "code": "DES-1",
      "name": "Desgranadora de maíz DES-1",
      "short": "desgranadora"
     },
     {
      "code": "LAV-1",
      "name": "Lavadora de verdura LAV-1",
      "short": "lavadora"
     },
     {
      "code": "ESC-1",
      "name": "Escaldador de tambor ESC-1",
      "short": "escaldador"
     },
     {
      "code": "TUN-1",
      "name": "Túnel IQF TUN-1",
      "short": "túnel IQF"
     },
     {
      "code": "OPT-1",
      "name": "Selectora óptica OPT-1",
      "short": "óptica"
     },
     {
      "code": "ENV-3",
      "name": "Envasadora ENV-3",
      "short": "envasado"
     },
     {
      "code": "DM-1",
      "name": "Detector de metales DM-1",
      "short": "detector de metales"
     }
    ],
    "route_text": "desgranadora DES-1 → lavadora LAV-1 → escaldador ESC-1 → túnel IQF TUN-1 → óptica OPT-1 → envasado ENV-3 → detector de metales DM-1",
    "origin_type": "campo",
    "bulk": null,
    "components": [],
    "qc": [
     "Recepción: índice de madurez 0,88 (óptimo 0,80-0,95), 15,1 °Brix",
     "Detector de metales DM-1 (PCC): verificaciones cada 2 h conformes ese día",
     "Etiquetado EE. UU. (inglés, 16 oz) verificado"
    ],
    "maintenance": [],
    "harvest_date": "2026-09-20",
    "grower": {
     "code": "AGR-0613",
     "zone": "Ribera navarra",
     "municipality": "Valtierra",
     "crops": [
      "maíz dulce"
     ],
     "contract": "Contrato de campaña 2026"
    },
    "parcels": [
     {
      "code": "P-0613-11",
      "grower": "AGR-0613",
      "municipality": "Valtierra",
      "zone": "Ribera navarra",
      "crop": "maíz dulce",
      "ha": 1.2,
      "sowing_date": "2026-06-01"
     },
     {
      "code": "P-0613-12",
      "grower": "AGR-0613",
      "municipality": "Valtierra",
      "zone": "Ribera navarra",
      "crop": "maíz dulce",
      "ha": 0.9,
      "sowing_date": "2026-06-03"
     }
    ],
    "intake": {
     "ticket": "REC-26-21390",
     "date": "2026-09-20",
     "time": "06:40",
     "net_t": 32.5
    },
    "maturity": {
     "index": 0.88,
     "spec": "0,80-0,95",
     "brix": 15.1,
     "note": "Grano en estado lechoso-pastoso"
    },
    "maturity_text": "índice de madurez 0,88, 15,1 °Brix",
    "summary": "Maíz dulce de AGR-0613 (P-0613-11, P-0613-12, Ribera navarra), cosecha 2026-09-20, recepción REC-26-21390 a las 06:40 (índice de madurez 0,88, 15,1 °Brix), L1 turno mañana",
    "transfer": null,
    "steps": [
     {
      "stage": "Campo",
      "detail": "Agricultor AGR-0613 · parcelas P-0613-11, P-0613-12 (Ribera navarra) · maíz dulce",
      "when": "2026-09-20",
      "ref": "AGR-0613"
     },
     {
      "stage": "Recepción",
      "detail": "Ticket REC-26-21390 · índice de madurez 0,88, 15,1 °Brix · 32,5 t",
      "when": "2026-09-20 06:40",
      "ref": "REC-26-21390"
     },
     {
      "stage": "Proceso",
      "detail": "Línea L1 (maíz dulce): desgranadora DES-1 → lavadora LAV-1 → escaldador ESC-1 → túnel IQF TUN-1 → óptica OPT-1 → envasado ENV-3 → detector de metales DM-1 · turno mañana",
      "when": "2026-09-20",
      "ref": "L1"
     },
     {
      "stage": "Calidad",
      "detail": "Recepción: índice de madurez 0,88 (óptimo 0,80-0,95), 15,1 °Brix; Detector de metales DM-1 (PCC): verificaciones cada 2 h conformes ese día; Etiquetado EE. UU. (inglés, 16 oz) verificado",
      "when": "2026-09-20",
      "ref": ""
     }
    ]
   },
   "forward": {
    "lot": "L26-263-FUS-MAI-02",
    "product": "Maíz dulce 450 g",
    "product_name": "Maíz dulce 450 g",
    "sku": "US-MAI-450",
    "brand": "CN Frozen Foods LLC (EE. UU.)",
    "produced_pallets": 24,
    "kg_total": 18144,
    "by_location": [
     {
      "location": "C-07",
      "pallets": 6,
      "label": "Cámara de expedición 7 (Fustiñana)",
      "lane": 6,
      "planned_shipment": "EXP-26-41118"
     },
     {
      "location": "SIL-4",
      "pallets": 18,
      "label": "Silo automático 4 (Fustiñana)",
      "lane": null,
      "planned_shipment": null
     }
    ],
    "shipments": [
     {
      "id": "EXP-26-41118",
      "pallets": 6,
      "date": "2026-09-30",
      "time": "07:00",
      "status": "planificada",
      "transport": "Contenedor reefer (consolidación, salida por puerto)",
      "dock": "Muelle 6",
      "end_customer": null,
      "customer": "CN Frozen Foods LLC (filial CN, EE. UU.)",
      "customer_id": "CLI-CNUS"
     }
    ],
    "shipped_pallets": 0,
    "stock_pallets": 24,
    "planned_pallets": 6,
    "customers": [
     "CN Frozen Foods LLC (filial CN, EE. UU.)"
    ],
    "transfer": null,
    "pallets": [
     {
      "sscc": "384123452630200014",
      "lot": "L26-263-FUS-MAI-02",
      "n": 1,
      "of": 24,
      "kg": 756,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41118",
      "position": "calle 6 · hueco 1"
     },
     {
      "sscc": "384123452630200021",
      "lot": "L26-263-FUS-MAI-02",
      "n": 2,
      "of": 24,
      "kg": 756,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41118",
      "position": "calle 6 · hueco 2"
     },
     {
      "sscc": "384123452630200038",
      "lot": "L26-263-FUS-MAI-02",
      "n": 3,
      "of": 24,
      "kg": 756,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41118",
      "position": "calle 6 · hueco 3"
     },
     {
      "sscc": "384123452630200045",
      "lot": "L26-263-FUS-MAI-02",
      "n": 4,
      "of": 24,
      "kg": 756,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41118",
      "position": "calle 6 · hueco 4"
     },
     {
      "sscc": "384123452630200052",
      "lot": "L26-263-FUS-MAI-02",
      "n": 5,
      "of": 24,
      "kg": 756,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41118",
      "position": "calle 6 · hueco 5"
     },
     {
      "sscc": "384123452630200069",
      "lot": "L26-263-FUS-MAI-02",
      "n": 6,
      "of": 24,
      "kg": 756,
      "location": "C-07",
      "location_label": "Cámara de expedición 7 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": "EXP-26-41118",
      "position": "calle 6 · hueco 6"
     },
     {
      "sscc": "384123452630200076",
      "lot": "L26-263-FUS-MAI-02",
      "n": 7,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200083",
      "lot": "L26-263-FUS-MAI-02",
      "n": 8,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200090",
      "lot": "L26-263-FUS-MAI-02",
      "n": 9,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200106",
      "lot": "L26-263-FUS-MAI-02",
      "n": 10,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200113",
      "lot": "L26-263-FUS-MAI-02",
      "n": 11,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200120",
      "lot": "L26-263-FUS-MAI-02",
      "n": 12,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200137",
      "lot": "L26-263-FUS-MAI-02",
      "n": 13,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200144",
      "lot": "L26-263-FUS-MAI-02",
      "n": 14,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200151",
      "lot": "L26-263-FUS-MAI-02",
      "n": 15,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200168",
      "lot": "L26-263-FUS-MAI-02",
      "n": 16,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200175",
      "lot": "L26-263-FUS-MAI-02",
      "n": 17,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200182",
      "lot": "L26-263-FUS-MAI-02",
      "n": 18,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200199",
      "lot": "L26-263-FUS-MAI-02",
      "n": 19,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200205",
      "lot": "L26-263-FUS-MAI-02",
      "n": 20,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200212",
      "lot": "L26-263-FUS-MAI-02",
      "n": 21,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200229",
      "lot": "L26-263-FUS-MAI-02",
      "n": 22,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200236",
      "lot": "L26-263-FUS-MAI-02",
      "n": 23,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452630200243",
      "lot": "L26-263-FUS-MAI-02",
      "n": 24,
      "of": 24,
      "kg": 756,
      "location": "SIL-4",
      "location_label": "Silo automático 4 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     }
    ],
    "summary": "24 palés: 6 en C-07, 18 en SIL-4"
   },
   "summary": {
    "lot": "L26-263-FUS-MAI-02",
    "product": "Maíz dulce 450 g",
    "brand": "CN Frozen Foods LLC (EE. UU.)",
    "origin_type": "campo",
    "origin": "Maíz dulce de AGR-0613 (P-0613-11, P-0613-12, Ribera navarra), cosecha 2026-09-20, recepción REC-26-21390 a las 06:40 (índice de madurez 0,88, 15,1 °Brix), L1 turno mañana",
    "forward": "24 palés: 6 en C-07, 18 en SIL-4",
    "grower": "AGR-0613",
    "harvest_date": "2026-09-20",
    "line": "L1",
    "production_date": "2026-09-20",
    "pallets": 24,
    "by_location": {
     "C-07": 6,
     "SIL-4": 18
    },
    "shipped": 0,
    "planned": 6,
    "stock": 24,
    "shipments": [
     "EXP-26-41118"
    ],
    "customers": [
     "CN Frozen Foods LLC (filial CN, EE. UU.)"
    ]
   }
  },
  "L26-231-FUS-GUI-01": {
   "info": {
    "product": "Guisante 1 kg (Garden Peas 1kg)",
    "plant": "FUS",
    "production_date": "2026-08-19",
    "best_before": "08/2028",
    "line": "L2",
    "route": [
     "LIM-2",
     "DP-2",
     "ESC-2",
     "TUN-2",
     "OPT-2",
     "ENV-4"
    ],
    "shift": "mañana",
    "origin": {
     "type": "campo",
     "harvest_date": "2026-08-19",
     "grower": "AGR-0412",
     "parcels": [
      "P-0412-07",
      "P-0412-09"
     ],
     "intake": {
      "ticket": "REC-26-18233",
      "date": "2026-08-19",
      "time": "10:42",
      "net_t": 24.6
     },
     "maturity": {
      "tenderometer_tr": 108,
      "spec": "95-120 TR"
     }
    },
    "qc": [
     "Recepción: tenderómetro 108 TR (especificación 95-120 TR): conforme",
     "Recepción: muestra de 2 kg sin piedras ni terrones (conforme)",
     "Selectora óptica OPT-2: rechazo del 1,6 % en el turno (referencia 1,5 %)",
     "Envasado ENV-4: control de peso y sellado conforme"
    ],
    "maintenance": [
     {
      "equipment": "DP-2",
      "date": "2026-08-18",
      "work_order": "OT-26-07415",
      "status": "abierta, pendiente de repuesto",
      "text": "desgaste de la malla anotado en la inspección semanal; sustitución programada"
     }
    ],
    "pallets": {
     "produced": 22,
     "allocation": [
      {
       "shipment": "EXP-26-40911",
       "count": 12
      },
      {
       "shipment": "EXP-26-40957",
       "count": 8
      },
      {
       "location": "SIL-3",
       "count": 2
      }
     ]
    },
    "code": "L26-231-FUS-GUI-01",
    "sku": "UK-GUI-1000",
    "product_name": "Guisante 1 kg (Garden Peas 1kg)",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "channel": "Retail UK (vía Freeworld Foods)",
    "origin_type": "campo",
    "plant_name": "Fustiñana",
    "line_name": "Línea L2 (guisante / judía verde)",
    "pallets_produced": 22,
    "kg_total": 17600,
    "std_value_eur": 25520.0
   },
   "back": {
    "code": "L26-231-FUS-GUI-01",
    "sku": "UK-GUI-1000",
    "product": "Guisante 1 kg (Garden Peas 1kg)",
    "product_name": "Guisante 1 kg (Garden Peas 1kg)",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "plant": "FUS",
    "lot": "L26-231-FUS-GUI-01",
    "plant_name": "Fustiñana",
    "production_date": "2026-08-19",
    "best_before": "08/2028",
    "line": "L2",
    "line_name": "Línea L2 (guisante / judía verde)",
    "shift": "mañana",
    "route": [
     {
      "code": "LIM-2",
      "name": "Limpiadora-aventadora LIM-2",
      "short": "limpieza"
     },
     {
      "code": "DP-2",
      "name": "Despedregadora DP-2",
      "short": "despedregadora"
     },
     {
      "code": "ESC-2",
      "name": "Escaldador ESC-2",
      "short": "escaldador"
     },
     {
      "code": "TUN-2",
      "name": "Túnel IQF TUN-2",
      "short": "túnel IQF"
     },
     {
      "code": "OPT-2",
      "name": "Selectora óptica OPT-2",
      "short": "óptica"
     },
     {
      "code": "ENV-4",
      "name": "Envasadora ENV-4",
      "short": "envasado"
     }
    ],
    "route_text": "limpieza LIM-2 → despedregadora DP-2 → escaldador ESC-2 → túnel IQF TUN-2 → óptica OPT-2 → envasado ENV-4",
    "origin_type": "campo",
    "bulk": null,
    "components": [],
    "qc": [
     "Recepción: tenderómetro 108 TR (especificación 95-120 TR): conforme",
     "Recepción: muestra de 2 kg sin piedras ni terrones (conforme)",
     "Selectora óptica OPT-2: rechazo del 1,6 % en el turno (referencia 1,5 %)",
     "Envasado ENV-4: control de peso y sellado conforme"
    ],
    "maintenance": [
     {
      "equipment": "DP-2",
      "date": "2026-08-18",
      "work_order": "OT-26-07415",
      "status": "abierta, pendiente de repuesto",
      "text": "desgaste de la malla anotado en la inspección semanal; sustitución programada"
     }
    ],
    "harvest_date": "2026-08-19",
    "grower": {
     "code": "AGR-0412",
     "zone": "Ribera navarra",
     "municipality": "Ribaforada",
     "crops": [
      "guisante",
      "judía verde"
     ],
     "contract": "Contrato de campaña 2026"
    },
    "parcels": [
     {
      "code": "P-0412-07",
      "grower": "AGR-0412",
      "municipality": "Ribaforada",
      "zone": "Ribera navarra",
      "crop": "guisante",
      "ha": 4.2,
      "sowing_date": "2026-05-28"
     },
     {
      "code": "P-0412-09",
      "grower": "AGR-0412",
      "municipality": "Ribaforada",
      "zone": "Ribera navarra",
      "crop": "guisante",
      "ha": 3.6,
      "sowing_date": "2026-05-30"
     }
    ],
    "intake": {
     "ticket": "REC-26-18233",
     "date": "2026-08-19",
     "time": "10:42",
     "net_t": 24.6
    },
    "maturity": {
     "tenderometer_tr": 108,
     "spec": "95-120 TR"
    },
    "maturity_text": "tenderómetro 108 TR",
    "summary": "Guisante de AGR-0412 (P-0412-07, P-0412-09, Ribera navarra), cosecha 2026-08-19, recepción REC-26-18233 a las 10:42 (tenderómetro 108 TR), L2 turno mañana",
    "transfer": null,
    "steps": [
     {
      "stage": "Campo",
      "detail": "Agricultor AGR-0412 · parcelas P-0412-07, P-0412-09 (Ribera navarra) · guisante",
      "when": "2026-08-19",
      "ref": "AGR-0412"
     },
     {
      "stage": "Recepción",
      "detail": "Ticket REC-26-18233 · tenderómetro 108 TR · 24,6 t",
      "when": "2026-08-19 10:42",
      "ref": "REC-26-18233"
     },
     {
      "stage": "Proceso",
      "detail": "Línea L2 (guisante / judía verde): limpieza LIM-2 → despedregadora DP-2 → escaldador ESC-2 → túnel IQF TUN-2 → óptica OPT-2 → envasado ENV-4 · turno mañana",
      "when": "2026-08-19",
      "ref": "L2"
     },
     {
      "stage": "Calidad",
      "detail": "Recepción: tenderómetro 108 TR (especificación 95-120 TR): conforme; Recepción: muestra de 2 kg sin piedras ni terrones (conforme); Selectora óptica OPT-2: rechazo del 1,6 % en el turno (referencia 1,5 %); Envasado ENV-4: control de peso y sellado conforme",
      "when": "2026-08-19",
      "ref": ""
     },
     {
      "stage": "Mantenimiento",
      "detail": "Despedregadora DP-2: desgaste de la malla anotado en la inspección semanal; sustitución programada. OT-26-07415: abierta, pendiente de repuesto",
      "when": "2026-08-18",
      "ref": "OT-26-07415"
     }
    ]
   },
   "forward": {
    "lot": "L26-231-FUS-GUI-01",
    "product": "Guisante 1 kg (Garden Peas 1kg)",
    "product_name": "Guisante 1 kg (Garden Peas 1kg)",
    "sku": "UK-GUI-1000",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "produced_pallets": 22,
    "kg_total": 17600,
    "by_location": [
     {
      "location": "SIL-3",
      "pallets": 2,
      "label": "Silo automático 3 (Fustiñana)",
      "lane": null,
      "planned_shipment": null
     }
    ],
    "shipments": [
     {
      "id": "EXP-26-40911",
      "pallets": 12,
      "date": "2026-08-25",
      "time": "16:10",
      "status": "expedida",
      "transport": "Camión frigorífico -25 °C",
      "dock": null,
      "end_customer": "Retailer UK (marca blanca)",
      "customer": "Freeworld Foods Ltd (filial CN, Reino Unido)",
      "customer_id": "CLI-FWF-UK"
     },
     {
      "id": "EXP-26-40957",
      "pallets": 8,
      "date": "2026-08-28",
      "time": "15:30",
      "status": "expedida",
      "transport": "Camión frigorífico -25 °C",
      "dock": null,
      "end_customer": "Retailer UK (marca blanca)",
      "customer": "Freeworld Foods Ltd (filial CN, Reino Unido)",
      "customer_id": "CLI-FWF-UK"
     }
    ],
    "shipped_pallets": 20,
    "stock_pallets": 2,
    "planned_pallets": 0,
    "customers": [
     "Freeworld Foods Ltd (filial CN, Reino Unido)"
    ],
    "transfer": null,
    "pallets": [
     {
      "sscc": "384123452310100016",
      "lot": "L26-231-FUS-GUI-01",
      "n": 1,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100023",
      "lot": "L26-231-FUS-GUI-01",
      "n": 2,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100030",
      "lot": "L26-231-FUS-GUI-01",
      "n": 3,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100047",
      "lot": "L26-231-FUS-GUI-01",
      "n": 4,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100054",
      "lot": "L26-231-FUS-GUI-01",
      "n": 5,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100061",
      "lot": "L26-231-FUS-GUI-01",
      "n": 6,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100078",
      "lot": "L26-231-FUS-GUI-01",
      "n": 7,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100085",
      "lot": "L26-231-FUS-GUI-01",
      "n": 8,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100092",
      "lot": "L26-231-FUS-GUI-01",
      "n": 9,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100108",
      "lot": "L26-231-FUS-GUI-01",
      "n": 10,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100115",
      "lot": "L26-231-FUS-GUI-01",
      "n": 11,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100122",
      "lot": "L26-231-FUS-GUI-01",
      "n": 12,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40911",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100139",
      "lot": "L26-231-FUS-GUI-01",
      "n": 13,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100146",
      "lot": "L26-231-FUS-GUI-01",
      "n": 14,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100153",
      "lot": "L26-231-FUS-GUI-01",
      "n": 15,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100160",
      "lot": "L26-231-FUS-GUI-01",
      "n": 16,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100177",
      "lot": "L26-231-FUS-GUI-01",
      "n": 17,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100184",
      "lot": "L26-231-FUS-GUI-01",
      "n": 18,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100191",
      "lot": "L26-231-FUS-GUI-01",
      "n": 19,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100207",
      "lot": "L26-231-FUS-GUI-01",
      "n": 20,
      "of": 22,
      "kg": 800,
      "location": "EXPEDIDO",
      "location_label": "Expedido",
      "status": "expedido",
      "shipment": "EXP-26-40957",
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100214",
      "lot": "L26-231-FUS-GUI-01",
      "n": 21,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     },
     {
      "sscc": "384123452310100221",
      "lot": "L26-231-FUS-GUI-01",
      "n": 22,
      "of": 22,
      "kg": 800,
      "location": "SIL-3",
      "location_label": "Silo automático 3 (Fustiñana)",
      "status": "en stock",
      "shipment": null,
      "planned_shipment": null,
      "position": null
     }
    ],
    "summary": "22 palés: 2 en SIL-3, 20 expedidos a Freeworld Foods Ltd (filial CN, Reino Unido) (EXP-26-40911, EXP-26-40957)"
   },
   "summary": {
    "lot": "L26-231-FUS-GUI-01",
    "product": "Guisante 1 kg (Garden Peas 1kg)",
    "brand": "Marca blanca retailer UK (vía Freeworld Foods)",
    "origin_type": "campo",
    "origin": "Guisante de AGR-0412 (P-0412-07, P-0412-09, Ribera navarra), cosecha 2026-08-19, recepción REC-26-18233 a las 10:42 (tenderómetro 108 TR), L2 turno mañana",
    "forward": "22 palés: 2 en SIL-3, 20 expedidos a Freeworld Foods Ltd (filial CN, Reino Unido) (EXP-26-40911, EXP-26-40957)",
    "grower": "AGR-0412",
    "harvest_date": "2026-08-19",
    "line": "L2",
    "production_date": "2026-08-19",
    "pallets": 22,
    "by_location": {
     "SIL-3": 2
    },
    "shipped": 20,
    "planned": 0,
    "stock": 2,
    "shipments": [
     "EXP-26-40911",
     "EXP-26-40957"
    ],
    "customers": [
     "Freeworld Foods Ltd (filial CN, Reino Unido)"
    ]
   }
  }
 },
 "machines": [
  {
   "name": "Túnel IQF TUN-1",
   "type": "tunel_iqf",
   "line": "L1",
   "ccp": false,
   "code": "TUN-1",
   "area": "Línea L1 (maíz dulce)",
   "metric": "tunnel_air_temp_c",
   "baseline": -35.0,
   "reading": -29.5,
   "unit": "°C aire",
   "note": "Aire 5,5 °C más caliente que la consigna: revisar desescarche de evaporadores y carga; mañana entra maíz de fin de campaña.",
   "metric_label": "temperatura de aire del túnel",
   "status": "warning"
  },
  {
   "name": "Túnel IQF TUN-2",
   "type": "tunel_iqf",
   "line": "L2",
   "ccp": false,
   "code": "TUN-2",
   "area": "Línea L2 (judía verde)",
   "metric": "tunnel_air_temp_c",
   "baseline": -35.0,
   "reading": -35.4,
   "unit": "°C aire",
   "metric_label": "temperatura de aire del túnel",
   "status": null
  },
  {
   "name": "Escaldador de banda ESC-3",
   "type": "escaldador",
   "line": "L3",
   "ccp": false,
   "code": "ESC-3",
   "area": "Línea L3 (judía verde)",
   "metric": "blanch_water_temp_c",
   "baseline": 92.0,
   "reading": 86.4,
   "unit": "°C agua",
   "note": "Agua por debajo de consigna: riesgo de escaldado insuficiente; verificar con ensayo de peroxidasa.",
   "metric_label": "temperatura del agua de escaldado",
   "status": "critical"
  },
  {
   "name": "Selectora óptica OPT-2",
   "type": "optica",
   "line": "L2",
   "ccp": false,
   "code": "OPT-2",
   "area": "Línea L2 (judía verde)",
   "metric": "reject_rate_pct",
   "baseline": 1.5,
   "reading": 4.8,
   "unit": "% rechazo",
   "note": "Rechazo triplicado: posible aumento de piedras y terrones en la entrada; revisar la despedregadora DP-2 (malla con desgaste anotado el 2026-08-18, OT-26-07415 abierta).",
   "metric_label": "tasa de rechazo",
   "status": "critical"
  },
  {
   "name": "Compresor de amoniaco NH3-C1",
   "type": "compresor_nh3",
   "line": "frio",
   "ccp": false,
   "code": "NH3-C1",
   "area": "Sala de máquinas frigorífica",
   "metric": "vibration_mm_s",
   "baseline": 2.1,
   "reading": 2.3,
   "unit": "mm/s RMS",
   "metric_label": "vibración",
   "status": null
  },
  {
   "name": "Compresor de amoniaco NH3-C2",
   "type": "compresor_nh3",
   "line": "frio",
   "ccp": false,
   "code": "NH3-C2",
   "area": "Sala de máquinas frigorífica",
   "metric": "vibration_mm_s",
   "baseline": 2.2,
   "reading": 6.2,
   "unit": "mm/s RMS",
   "note": "Vibración por encima de 6 mm/s: riesgo de avería del compresor de amoniaco; inspeccionar y valorar el relevo con NH3-C1.",
   "metric_label": "vibración",
   "status": "critical"
  },
  {
   "name": "Evaporador EV-SIL3 (silo automático 3)",
   "type": "evaporador",
   "line": "frio",
   "ccp": false,
   "code": "EV-SIL3",
   "area": "Silo automático 3",
   "metric": "hours_since_defrost",
   "baseline": 8.0,
   "reading": 14.0,
   "unit": "h",
   "note": "Desescarche pendiente: el silo 3 está a -23,9 °C (consigna -25 °C), aún dentro de límites.",
   "metric_label": "horas desde el último desescarche",
   "status": "warning"
  },
  {
   "name": "Envasadora de mezclas ENV-5",
   "type": "envasadora",
   "line": "L5",
   "ccp": false,
   "code": "ENV-5",
   "area": "Sala de envasado (mezclas)",
   "metric": "stops_per_hour",
   "baseline": 2.0,
   "reading": 7.0,
   "unit": "paradas/h",
   "note": "Atascos de film en la mordaza; ya hay una orden de trabajo abierta.",
   "open_work_order": "OT-26-08812",
   "metric_label": "paradas por hora",
   "status": "warning"
  },
  {
   "name": "Detector de metales DM-1",
   "type": "detector_metales",
   "line": "L1",
   "ccp": true,
   "code": "DM-1",
   "area": "Línea L1 (maíz dulce), salida de envasado",
   "metric": "hours_since_verification",
   "baseline": 2.0,
   "reading": 3.5,
   "unit": "h",
   "note": "PCC: verificación con probetas vencida (3,5 h; máximo 2 h). Verificar ya y retener el producto envasado desde la última verificación correcta (02:30).",
   "metric_label": "horas desde la última verificación",
   "status": "critical"
  },
  {
   "name": "Lavadora de verdura LAV-1",
   "type": "lavadora",
   "line": "L1",
   "ccp": false,
   "code": "LAV-1",
   "area": "Línea L1 (maíz dulce)",
   "metric": "free_chlorine_ppm",
   "baseline": 3.0,
   "reading": 2.6,
   "unit": "ppm",
   "metric_label": "cloro libre en el agua de lavado",
   "status": null
  },
  {
   "name": "Caldera de vapor CAL-B1",
   "type": "caldera",
   "line": "servicios",
   "ccp": false,
   "code": "CAL-B1",
   "area": "Sala de calderas",
   "metric": "steam_pressure_bar",
   "baseline": 10.0,
   "reading": 9.8,
   "unit": "bar",
   "metric_label": "presión de vapor",
   "status": null
  }
 ],
 "thresholds": {
  "tunnel_air_temp_c": {
   "direction": "high",
   "warning_abs": -32.0,
   "critical_abs": -28.0
  },
  "blanch_water_temp_c": {
   "direction": "both",
   "warning_abs_delta": 2.0,
   "critical_abs_delta": 4.0
  },
  "reject_rate_pct": {
   "direction": "high",
   "warning_abs": 2.5,
   "critical_abs": 4.0
  },
  "vibration_mm_s": {
   "direction": "high",
   "warning_abs": 4.5,
   "critical_abs": 6.0
  },
  "hours_since_defrost": {
   "direction": "high",
   "warning_abs": 10.0,
   "critical_abs": 16.0
  },
  "stops_per_hour": {
   "direction": "high",
   "warning_abs": 4.0,
   "critical_abs": 9.0
  },
  "hours_since_verification": {
   "direction": "high",
   "warning_abs": 1.75,
   "critical_abs": 2.0
  },
  "free_chlorine_ppm": {
   "direction": "both",
   "warning_abs_delta": 1.0,
   "critical_abs_delta": 2.0
  },
  "steam_pressure_bar": {
   "direction": "low",
   "warning": 0.85,
   "critical": 0.75
  }
 },
 "complaint": {
  "code": "UKC-44718",
  "consumer_ref": "UKC-44718",
  "received_date": "2026-09-26",
  "received_time": "10:14",
  "channel": "email",
  "language": "en",
  "from_label": "Quality Assurance, Freeworld Foods Ltd",
  "from_address": "qa.team@freeworld-foods.example",
  "on_behalf_of": "Retailer UK (marca blanca)",
  "customer": "CLI-FWF-UK",
  "product_en": "Garden Peas 1kg",
  "sku": "UK-GUI-1000",
  "lot": "L26-231-FUS-GUI-01",
  "best_before": "08/2028",
  "defect": {
   "category": "cuerpo_extrano",
   "type": "piedra",
   "type_en": "stone",
   "size_mm": 8,
   "injury": false,
   "hazard": "Peligro físico: objeto duro de 7 mm o más"
  },
  "evidence": {
   "photos": 2,
   "sample": "En camino (enviada por el cliente)"
  },
  "requested": "Informe de investigación en 5 días hábiles",
  "response_due": "2026-10-02",
  "email_text": "From: Quality Assurance, Freeworld Foods Ltd <qa.team@freeworld-foods.example>\nTo: Calidad, Congelados de Navarra <calidad@cn-demo.example>\nDate: Sat, 26 Sep 2026 09:14 (UK time)\nSubject: Customer complaint - foreign body (stone) - Garden Peas 1kg - Lot L26-231-FUS-GUI-01 - Ref UKC-44718\n\nDear Quality Team,\n\nWe have received a consumer complaint through our UK retail customer (own-label frozen range) about the product below, and we need your support to investigate it as a priority.\n\nProduct: Garden Peas 1kg (retailer own label)\nLot code: L26-231-FUS-GUI-01\nBest before: 08/2028\nConsumer reference: UKC-44718\nComplaint received by the retailer: 24/09/2026\n\nThe consumer reports finding a small, hard foreign body, which appears to be a stone of approximately 8 mm, while serving the product. No injury has been reported. The consumer has kept the item and the retailer has shared two photographs (attached). The physical sample is on its way to our UK office and we will forward it to you as soon as we receive it.\n\nAs this is a physical contamination complaint on a retailer own-label product, our customer requests a full investigation report within 5 working days, including:\n- traceability of the lot (raw material, harvest, intake and processing line);\n- the stone-removal and foreign-body controls on the line (destoner, optical sorting) and their records for the production date;\n- root cause, corrective and preventive actions;\n- confirmation of whether any other stock from the same lot is affected.\n\nPlease confirm receipt and let us know your investigation reference.\n\nKind regards,\n\nQuality Assurance Team\nFreeworld Foods Ltd\n",
  "ref": "UKC-44718",
  "headers": {
   "From": "Quality Assurance, Freeworld Foods Ltd <qa.team@freeworld-foods.example>",
   "To": "Calidad, Congelados de Navarra <calidad@cn-demo.example>",
   "Date": "Sat, 26 Sep 2026 09:14 (UK time)",
   "Subject": "Customer complaint - foreign body (stone) - Garden Peas 1kg - Lot L26-231-FUS-GUI-01 - Ref UKC-44718"
  },
  "subject": "Customer complaint - foreign body (stone) - Garden Peas 1kg - Lot L26-231-FUS-GUI-01 - Ref UKC-44718",
  "body": "Dear Quality Team,\n\nWe have received a consumer complaint through our UK retail customer (own-label frozen range) about the product below, and we need your support to investigate it as a priority.\n\nProduct: Garden Peas 1kg (retailer own label)\nLot code: L26-231-FUS-GUI-01\nBest before: 08/2028\nConsumer reference: UKC-44718\nComplaint received by the retailer: 24/09/2026\n\nThe consumer reports finding a small, hard foreign body, which appears to be a stone of approximately 8 mm, while serving the product. No injury has been reported. The consumer has kept the item and the retailer has shared two photographs (attached). The physical sample is on its way to our UK office and we will forward it to you as soon as we receive it.\n\nAs this is a physical contamination complaint on a retailer own-label product, our customer requests a full investigation report within 5 working days, including:\n- traceability of the lot (raw material, harvest, intake and processing line);\n- the stone-removal and foreign-body controls on the line (destoner, optical sorting) and their records for the production date;\n- root cause, corrective and preventive actions;\n- confirmation of whether any other stock from the same lot is affected.\n\nPlease confirm receipt and let us know your investigation reference.\n\nKind regards,\n\nQuality Assurance Team\nFreeworld Foods Ltd",
  "customer_label": "Freeworld Foods Ltd (filial CN, Reino Unido)",
  "product_name": "Guisante 1 kg (Garden Peas 1kg)"
 },
 "complaint_history": [
  {
   "id": "RCL-2026-0204",
   "date": "2026-07-15",
   "customer": "CLI-CNUS",
   "product": "Maíz dulce 450 g",
   "lot": "L26-160-FUS-MAI-01",
   "category": "calidad",
   "similar": false,
   "description": "Producto apelmazado (bloques de hielo) en destino",
   "nc": "NC-2026-0233",
   "root_cause": "Rotura de frío en el transporte del cliente",
   "status": "cerrada",
   "customer_label": "CN Frozen Foods LLC (filial CN, EE. UU.)"
  },
  {
   "id": "RCL-2026-0131",
   "date": "2026-05-07",
   "customer": "CLI-IMP-FR",
   "product": "Judía verde redonda 1 kg",
   "lot": "L26-118-FUS-JUD-02",
   "category": "calidad",
   "similar": false,
   "description": "Hilos en la judía verde por encima de especificación",
   "nc": "NC-2026-0158",
   "root_cause": "Ajuste de la despuntadora COR-3",
   "status": "cerrada",
   "customer_label": "Importador Francia"
  },
  {
   "id": "RCL-2026-0042",
   "date": "2026-02-20",
   "customer": "CLI-RET-ES",
   "product": "Guisante fino 1 kg (Verleal)",
   "lot": "L26-041-FUS-GUI-02",
   "category": "envase",
   "similar": false,
   "description": "Bolsa mal sellada (soldadura abierta)",
   "nc": "NC-2026-0097",
   "root_cause": "Temperatura de mordaza baja en ENV-2",
   "status": "cerrada",
   "customer_label": "Plataforma logística retail ES"
  },
  {
   "id": "RCL-2025-0311",
   "date": "2025-11-14",
   "customer": "CLI-RET-ES",
   "product": "Espinaca en porciones 1 kg (Verleal)",
   "lot": "L25-310-ALF-ESP-02",
   "category": "cuerpo_extrano",
   "similar": true,
   "description": "Piedra de unos 6 mm en espinaca en porciones",
   "nc": "NC-2025-0388",
   "root_cause": "Malla de la despedregadora de la línea de hoja (Alcorioja) con desgaste",
   "status": "cerrada (2025-12-02)",
   "customer_label": "Plataforma logística retail ES"
  }
 ],
 "campaign": {
  "date": "2026-09-30",
  "weekday": "miércoles",
  "plant": "FUS",
  "note": "Final de campaña de maíz dulce y judía verde",
  "weather": {
   "max_c": 27,
   "min_c": 13,
   "rain": false,
   "note": "Calor por la tarde: acelera la maduración en campo"
  },
  "operating_hours": {
   "start": "06:00",
   "end": "22:00"
  },
  "slot_minutes": 120,
  "slots": [
   "06-08",
   "08-10",
   "10-12",
   "12-14",
   "14-16",
   "16-18",
   "18-20",
   "20-22"
  ],
  "rule_field_to_tunnel_max_min": 150,
  "load_min": 20,
  "reception_prep_min": {
   "maiz_dulce": 45,
   "judia_verde": 35
  },
  "crops": {
   "maiz_dulce": {
    "label": "Maíz dulce",
    "tunnel": "TUN-1",
    "optimal_min": 0.8,
    "optimal_max": 0.95
   },
   "judia_verde": {
    "label": "Judía verde",
    "tunnel": "TUN-2",
    "optimal_min": 0.75,
    "optimal_max": 0.92
   }
  },
  "tunnels": {
   "TUN-1": {
    "crop": "maiz_dulce",
    "line": "L1",
    "capacity_t_h": 11.0,
    "derate_if_warning": 0.85,
    "note": "En aviso en el parte de hoy (aire -29,5 °C frente a -35 °C): si no se corrige, capacidad efectiva del 85 %.",
    "slot_capacity_t": 22.0,
    "slot_load_t": {
     "06-08": 20.0,
     "08-10": 21.0,
     "10-12": 18.0,
     "12-14": 16.0,
     "14-16": 30.0,
     "16-18": 19.0,
     "18-20": 14.0,
     "20-22": 0.0
    },
    "overloaded_slots": [
     "14-16"
    ]
   },
   "TUN-2": {
    "crop": "judia_verde",
    "line": "L2",
    "capacity_t_h": 8.0,
    "slot_capacity_t": 16.0,
    "slot_load_t": {
     "06-08": 12.0,
     "08-10": 13.0,
     "10-12": 11.0,
     "12-14": 10.0,
     "14-16": 21.0,
     "16-18": 10.0,
     "18-20": 0.0,
     "20-22": 0.0
    },
    "overloaded_slots": [
     "14-16"
    ]
   }
  },
  "parcels": [
   {
    "id": "P-0613-14",
    "grower": "AGR-0613",
    "crop": "maiz_dulce",
    "municipality": "Valtierra",
    "expected_t": 20,
    "maturity_index": 0.88,
    "distance_km": 19,
    "travel_min": 24,
    "harvest_slot": "06-08",
    "field_to_tunnel_min": 89,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0634-03",
    "grower": "AGR-0634",
    "crop": "maiz_dulce",
    "municipality": "Cadreita",
    "expected_t": 21,
    "maturity_index": 0.9,
    "distance_km": 23,
    "travel_min": 28,
    "harvest_slot": "08-10",
    "field_to_tunnel_min": 93,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0634-05",
    "grower": "AGR-0634",
    "crop": "maiz_dulce",
    "municipality": "Cadreita",
    "expected_t": 18,
    "maturity_index": 0.86,
    "distance_km": 23,
    "travel_min": 28,
    "harvest_slot": "10-12",
    "field_to_tunnel_min": 93,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0658-01",
    "grower": "AGR-0658",
    "crop": "maiz_dulce",
    "municipality": "Milagro",
    "expected_t": 16,
    "maturity_index": 0.84,
    "distance_km": 36,
    "travel_min": 42,
    "harvest_slot": "12-14",
    "field_to_tunnel_min": 107,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0658-02",
    "grower": "AGR-0658",
    "crop": "maiz_dulce",
    "municipality": "Milagro",
    "expected_t": 17,
    "maturity_index": 0.83,
    "distance_km": 36,
    "travel_min": 42,
    "harvest_slot": "14-16",
    "field_to_tunnel_min": 107,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0671-07",
    "grower": "AGR-0671",
    "crop": "maiz_dulce",
    "municipality": "Castejón",
    "expected_t": 13,
    "maturity_index": 0.81,
    "distance_km": 26,
    "travel_min": 32,
    "harvest_slot": "14-16",
    "field_to_tunnel_min": 97,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0613-15",
    "grower": "AGR-0613",
    "crop": "maiz_dulce",
    "municipality": "Valtierra",
    "expected_t": 19,
    "maturity_index": 1.03,
    "distance_km": 19,
    "travel_min": 24,
    "harvest_slot": "16-18",
    "field_to_tunnel_min": 89,
    "within_rule": true,
    "past_maturity": true,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0719-02",
    "grower": "AGR-0719",
    "crop": "maiz_dulce",
    "municipality": "Mendavia",
    "expected_t": 14,
    "maturity_index": 0.87,
    "distance_km": 78,
    "travel_min": 95,
    "harvest_slot": "18-20",
    "field_to_tunnel_min": 160,
    "within_rule": false,
    "past_maturity": false,
    "tunnel": "TUN-1"
   },
   {
    "id": "P-0527-05",
    "grower": "AGR-0527",
    "crop": "judia_verde",
    "municipality": "Castejón",
    "expected_t": 12,
    "maturity_index": 0.84,
    "distance_km": 26,
    "travel_min": 32,
    "harvest_slot": "06-08",
    "field_to_tunnel_min": 87,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-2"
   },
   {
    "id": "P-0527-06",
    "grower": "AGR-0527",
    "crop": "judia_verde",
    "municipality": "Castejón",
    "expected_t": 13,
    "maturity_index": 0.86,
    "distance_km": 26,
    "travel_min": 32,
    "harvest_slot": "08-10",
    "field_to_tunnel_min": 87,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-2"
   },
   {
    "id": "P-0540-02",
    "grower": "AGR-0540",
    "crop": "judia_verde",
    "municipality": "Cortes",
    "expected_t": 11,
    "maturity_index": 0.8,
    "distance_km": 16,
    "travel_min": 22,
    "harvest_slot": "10-12",
    "field_to_tunnel_min": 77,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-2"
   },
   {
    "id": "P-0540-03",
    "grower": "AGR-0540",
    "crop": "judia_verde",
    "municipality": "Cortes",
    "expected_t": 10,
    "maturity_index": 0.78,
    "distance_km": 16,
    "travel_min": 22,
    "harvest_slot": "12-14",
    "field_to_tunnel_min": 77,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-2"
   },
   {
    "id": "P-0561-01",
    "grower": "AGR-0561",
    "crop": "judia_verde",
    "municipality": "Ribaforada",
    "expected_t": 12,
    "maturity_index": 0.88,
    "distance_km": 8,
    "travel_min": 14,
    "harvest_slot": "14-16",
    "field_to_tunnel_min": 69,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-2"
   },
   {
    "id": "P-0540-04",
    "grower": "AGR-0540",
    "crop": "judia_verde",
    "municipality": "Cortes",
    "expected_t": 9,
    "maturity_index": 0.79,
    "distance_km": 16,
    "travel_min": 22,
    "harvest_slot": "14-16",
    "field_to_tunnel_min": 77,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-2"
   },
   {
    "id": "P-0561-02",
    "grower": "AGR-0561",
    "crop": "judia_verde",
    "municipality": "Ribaforada",
    "expected_t": 10,
    "maturity_index": 0.9,
    "distance_km": 8,
    "travel_min": 14,
    "harvest_slot": "16-18",
    "field_to_tunnel_min": 69,
    "within_rule": true,
    "past_maturity": false,
    "tunnel": "TUN-2"
   }
  ]
 }
};
