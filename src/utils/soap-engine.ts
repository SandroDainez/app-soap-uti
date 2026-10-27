// ============================================================================
// SOAP ENGINE - Motor de Processamento Clínico para Evolução de UTI
// Arquitetura em 8 etapas:
// 1. Extração texto-base
// 2. Extração exame atual
// 3. Normalização e classificação
// 4. Conciliação temporal, duplicações, conflitos
// 5. Objeto clínico estruturado
// 6. Validação e complementação pelo médico (UI)
// 7. Geração SOAP final
// 8. Verificação automática
// ============================================================================

// ======================== TIPOS ========================

export interface DataPoint {
  value: string;
  source: 'texto-base' | 'exame-atual' | 'sistema';
  timestamp?: string; // data/hora extraída do texto
  isCurrent?: boolean; // se é informação atual
}

export interface Diagnostico {
  texto: string;
  cid: string;
  status: 'confirmado' | 'hipotese' | 'resolvido';
  source: 'texto-base' | 'exame-atual' | 'manual';
}

export interface Medicamento {
  nome: string;
  dose?: string;
  intervalo?: string;
  via?: string;
  dataInicio?: string;
  diaTratamento?: string;
  indicacao?: string;
  previsaoTermino?: string;
  categoria: 'antimicrobiano' | 'analgesia-sedacao' | 'anticoagulacao' | 'profilaxia-ulcera' | 'insulina' | 'vasoativo' | 'outro';
  source: 'texto-base' | 'exame-atual' | 'manual';
}

export interface Cultura {
  material: string;
  dataColeta?: string;
  microrganismo?: string;
  resistencia?: string;
  situacao: 'positiva' | 'negativa' | 'colonizacao' | 'pendente';
  tratamentoAssociado?: string;
  source: 'texto-base' | 'exame-atual' | 'manual';
}

export interface ExameLaboratorial {
  nome: string;
  valor: string;
  unidade?: string;
  data?: string;
  tendencia?: 'melhora' | 'piora' | 'estavel' | 'novo';
  source: 'texto-base' | 'exame-atual' | 'manual';
}

export interface Ventilacao {
  tipo: 'invasiva-tot' | 'invasiva-tqt' | 'nao-invasiva' | 'espontanea-tqt' | 'cateter-nasal' | 'nenhum';
  modalidade?: string;
  interface?: string;
  fio2?: string;
  peep?: string;
  pressaoInsp?: string;
  fr?: string;
  vc?: string;
  spo2?: string;
  gasometria?: string;
  source: 'texto-base' | 'exame-atual' | 'manual';
}

export interface Conflito {
  campo: string;
  valorAnterior: string;
  valorAtual: string;
  resolvido: boolean;
  resolucao?: string;
}

export interface Alerta {
  tipo: 'ausencia' | 'conflito' | 'classificacao' | 'hipotese' | 'incompleto' | 'sem-plano';
  severidade: 'info' | 'warning' | 'error';
  mensagem: string;
  campo?: string;
  resolvido: boolean;
}

export interface ClinicalData {
  identificacao: {
    nome: DataPoint | null;
    leito: DataPoint | null;
    convenio: DataPoint | null;
    dataHora: DataPoint | null;
    diaUTI: DataPoint | null;
  };
  subjetivo: {
    hda: DataPoint[];
    motivoInternacao: DataPoint[];
    antecedentes: DataPoint[];
    eventosInternacao: DataPoint[];
    infoSubjetivaAtual: DataPoint[];
  };
  objetivo: {
    sinaisVitais: DataPoint[];
    neurologico: DataPoint[];
    cardiovascular: DataPoint[];
    respiratorio: DataPoint[];
    renal: DataPoint[];
    gastrointestinal: DataPoint[];
    extremidades: DataPoint[];
    dispositivos: DataPoint[];
    examesLaboratoriais: ExameLaboratorial[];
    microbiologia: Cultura[];
    tratamentos: Medicamento[];
    ventilacao: Ventilacao | null;
  };
  avaliacao: {
    sintese: DataPoint[];
    diagnosticos: Diagnostico[];
    hipoteses: Diagnostico[];
    evolucaoProblemas: DataPoint[];
    pendencias: DataPoint[];
  };
  plano: {
    condutasPorProblema: DataPoint[];
    antimicrobianos: DataPoint[];
    suporteVentilatorio: DataPoint[];
    medidasHemodinamicas: DataPoint[];
    controleRenal: DataPoint[];
    nutricao: DataPoint[];
    profilaxias: DataPoint[];
    examesInterconsultas: DataPoint[];
    metasTerapeuticas: DataPoint[];
    reavaliacoes: DataPoint[];
  };
}

export interface ProcessedEvolution {
  data: ClinicalData;
  alertas: Alerta[];
  conflitos: Conflito[];
  validacaoFinal: {
    passou: boolean;
    erros: string[];
    avisos: string[];
  };
}

// ======================== ETAPA 1 & 2: EXTRAÇÃO ========================

interface ExtractionResult {
  identificacao: { nome?: string; leito?: string; convenio?: string; dataHora?: string; diaUTI?: string };
  subjetivo: { hda: string[]; motivoInternacao: string[]; antecedentes: string[]; eventosInternacao: string[]; infoSubjetivaAtual: string[] };
  sinaisVitais: string[];
  neurologico: string[];
  cardiovascular: string[];
  respiratorio: string[];
  ventilacao: Partial<Ventilacao> | null;
  renal: string[];
  gastrointestinal: string[];
  extremidades: string[];
  dispositivos: string[];
  examesLab: ExameLaboratorial[];
  microbiologia: Cultura[];
  medicamentos: Medicamento[];
  diagnosticos: Diagnostico[];
  hipoteses: Diagnostico[];
  avaliacao: string[];
  plano: {
    condutasPorProblema: string[];
    antimicrobianos: string[];
    suporteVentilatorio: string[];
    medidasHemodinamicas: string[];
    controleRenal: string[];
    nutricao: string[];
    profilaxias: string[];
    examesInterconsultas: string[];
    metasTerapeuticas: string[];
    reavaliacoes: string[];
  };
}

function createEmptyExtraction(): ExtractionResult {
  return {
    identificacao: {},
    subjetivo: { hda: [], motivoInternacao: [], antecedentes: [], eventosInternacao: [], infoSubjetivaAtual: [] },
    sinaisVitais: [], neurologico: [], cardiovascular: [], respiratorio: [],
    ventilacao: null, renal: [], gastrointestinal: [], extremidades: [], dispositivos: [],
    examesLab: [], microbiologia: [], medicamentos: [],
    diagnosticos: [], hipoteses: [], avaliacao: [],
    plano: {
      condutasPorProblema: [], antimicrobianos: [], suporteVentilatorio: [],
      medidasHemodinamicas: [], controleRenal: [], nutricao: [], profilaxias: [],
      examesInterconsultas: [], metasTerapeuticas: [], reavaliacoes: [],
    },
  };
}

// Extrai timestamp de uma linha (padrões comuns)
function extractTimestamp(line: string): string | undefined {
  // Padrões: "01/01/2024", "01/01/2024 10:00", "D1", "D+3", "24/10", "hoje", "ontem"
  const patterns = [
    /(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)/,
    /(\d{2}\/\d{2}(?:\/\d{2,4})?(?:\s+\d{2}:\d{2})?)/,
    /(D[\+\-]?\d+)/,
    /(dia\s+\d+)/i,
    /(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)/,
  ];
  for (const p of patterns) {
    const m = line.match(p);
    if (m) return m[1];
  }
  return undefined;
}

// Classifica uma linha em uma categoria
function classifyLine(line: string): string | null {
  const lower = line.toLowerCase().trim();
  if (!lower) return null;

  // === IDENTIFICAÇÃO ===
  if (/^(paciente:|nome:|leito:|quarto:|conv[eê]nio:|prontu[áa]rio:|data:|hora:|dia de uti|d[úu]t[íi]:|admitido em|internado em)/.test(lower)) return 'identificacao';

  // === SUBJETIVO ===
  if (/^(subjetivo|queixa principal|qp:|hda:|hist[óo]ria da doen[çc]a|hist[óo]ria cl[íi]nica|antecedentes|hist[óo]ria pregressa|relata que|refere que|queixa de|acompanhante relata|fam[íi]lia relata|trazido por|paciente relata|paciente refere|in[íi]cio dos sintomas|h[áa] dias|h[áa] horas|onset|motivo da interna[çc][ãa]o|motivo interna[çc][ãa]o)/.test(lower)) return 'subjetivo';

  // === SINAIS VITAIS ===
  if (/^(sv:|sinais vitais|pa:|ta:|pam:|pam |fc:|fc |fr:|fr |temp:|temp |temperatura|spo2|satura[çc][ãa]o|tmax|tmin|press[ãa]o arterial|frequ[êe]ncia card|frequ[êe]ncia resp)/.test(lower)) return 'sinaisVitais';

  // === NEUROLÓGICO ===
  if (/^(neurol[óo]gico|glasgow|pupilas|seda[çc][ãa]o|rass|richmond|delirium|cam-icu|convuls[ãa]o|focalidade|midr[íi]ase|isoc[óo]ricas|isocoricas|anisocoria|movimenta[çc][ãa]o|for[çc]a muscular|reflexos|sensibilidade|escala de coma|reatividade pupilar)/.test(lower)) return 'neurologico';

  // === CARDIOVASCULAR (achados de exame físico cardiovascular) ===
  if (/^(cardiovascular|ac |ausculta card[íi]aca|bulhas|sopros|ictus|pulso|perfus[ãa]o perif[ée]rica|enchimento capilar|edema de mmii|turg[êe]ncia jugular)/.test(lower)) return 'cardiovascular';

  // === VENTILAÇÃO ===
  if (/^(ventila[çc][ãa]o mec|vm:|vm |ventilat[óo]rio|peep|fio2|fiO2|pplat|pico|weaning|extuba[çc][ãa]o|traqueostomia|modo ventilat|pcv|vcv|psv|bipap|cpap|cateter nasal|m[áa]scara de|venturi|t-piece|ar ambiente|oxig[eê]nio suplementar|vni|vpn|cpap nasal)/.test(lower)) return 'ventilacao';

  // === RESPIRATÓRIO (achados de exame físico respiratório) ===
  if (/^(respirat[óo]rio|ap |ausculta pulmonar|murmu|ru[íi]dos advent|estertores|sibilos|roncos|crepita[çc][ãa]o|expansibilidade|tiragem|uso de musculatura acess[óo]ria|gasometria|gaso|pco2|po2|ph |hco3|be |base excess|rela[çc][ãa]o p\/f|pfr)/.test(lower)) return 'respiratorio';

  // === RENAL ===
  if (/^(renal|diurese|urina|creatinina|ureia|tfg|hemodi[áa]lise|hemodialise|balan[çc]o h[íi]drico|balanco hidrico|bhd|crrt|tdc|catheter|volume total|protein[úu]ria|sedimento urin)/.test(lower)) return 'renal';

  // === GASTROINTESTINAL ===
  if (/^(gastrointestinal|gi:|hep[áa]tico|abdome|abdominal|dieta|nutri[çc][ãa]o|sng|sngt|sng\/|evacua[çc][ãa]o|fezes|ascite|distens[ãa]o abdominal|rha|ru[íi]dos hidro|tgp|tgo|bilirrubina|albumina|v[ôo]mito|n[áa]usea|deito|g[áa]strico|intestinal|enteral|parenteral|trato digest|digest[óo]rio)/.test(lower)) return 'gastrointestinal';

  // === EXTREMIDADES/PELE ===
  if (/^(extremidades|membros superiores|membros inferiores|msii|mmss|mmii|pele|acracias|cianose|livedo|perfus[ãa]o|edema de membros|[úu]lcera de press[ãa]o|[úu]lcera por press[ãa]o|les[ãa]o de pele|bradenco|escara|up|les[ãa]o por press[ãa]o)/.test(lower)) return 'extremidades';

  // === DISPOSITIVOS ===
  if (/^(dispositivo|dreno|sonda (vesical|naso|oro)|jal|acesso venoso|acesso arterial|iot |tqt |m[áa]scara lar[íi]n|cateter venoso central|cateter arterial|swan|capn[óo]grafo|picc|cvc|pvc)/.test(lower)) return 'dispositivos';

  // === EXAMES LABORATORIAIS ===
  if (/^(exame|laborat[óo]rio|hemograma|hemoglobina|hemat[óo]crito|plaquetas|leuc[óo]citos|leucopenia|leucocitose|coagulograma|inr|tpa|tp |fibrinog[eê]nio|d-d[íi]mero|ddimer|ht:|hb:|hgb|neutr[óo]filos|linf[óo]citos|eosin[óo]filos|bas[óo]filos|mon[óo]citos|reticul[óo]citos|vcm|HCM |hcm |rdw|s[óo]dio|pot[áa]ssio|c[áa]lcio|magn[ée]sio|fosfato|lactato|lact|glicemia|glicose|pcr |crp |procalcitonina|pct|tgp|tgo|bilirrubina|albumina|creatinina|ureia|eletr[óo]litos|ionograma|na:|na |k:|k |cl:|cl |gap ani|osmolaridade|dosagem|resultado de exame|laudo laboratorial)/.test(lower)) return 'examesLab';

  // === MICROBIOLOGIA ===
  if (/^(cultura|hemocultura|urocultura|cultura de|secre[çc][ãa]o|escarro|aspirado|l[íi]quor|l[íi]quido |material coletado|microrganismo|antibiograma|kpc|mrsa|mrse|esbl|pseudomonas|acinetobacter|candida|enterobact|gram|bact[ée]ria|fungo|coloniza[çc][ãa]o|precau[çc][ãa]o de contato|isolamento)/.test(lower)) return 'microbiologia';

  // === MEDICAMENTOS ===
  if (/^(medica[çc][ãa]o|antibi[óo]tico|meropenem|piperacilina|vancomicina|noradrenalina|adrenalina|vasopressina|dobutamina|dopamina|metadona|morfina|fentanil|propofol|midazolam|dexmedetomidina|cetamina|heparina|enoxaparina|omeprazol|pantoprazol|insulina|profilaxia|prescri[çc][ãa]o|droga|drogas|medica[çc][õo]es)/.test(lower)) return 'medicamentos';

  // === DIAGNÓSTICO ===
  if (/^(dx:|dx |diagn[óo]stico|hip[óo]tese diagn|hip[óo]tese de|hip[óo]teses diagn|problemas ativos|diagn[óo]sticos|cid)/.test(lower)) return 'diagnostico';

  // === AVALIAÇÃO ===
  if (/^(avalia[çc][ãa]o|quadro cl[íi]nico|evolu[çc][ãa]o cl[íi]nica|melhora|piora|est[áa]vel|grave|cr[íi]tico|resposta terap|paciente apresenta|encontra-se|mant[ée]m-se|apresenta melhora|apresenta piora|quadro de|paciente em|conclus[ãa]o|s[íi]ntese|an[áa]lise cl[íi]nica)/.test(lower)) return 'avaliacao';

  // === PLANO ===
  if (/^(plano|conduta|prescri[çc][ãa]o|ajuste|manter|suspender|iniciar|trocar|meta|solicitar|interconsulta|procedimento|prescrever|orientar|encaminhar|liberar|restringir|monitorar|titular|reavaliar|otimizar|desmame|weaning|profilaxia|prevenir|plano terap)/.test(lower)) return 'plano';

  return null;
}

// Extrai dados de um texto (texto-base ou exame atual)
function extractFromText(text: string, source: 'texto-base' | 'exame-atual'): ExtractionResult {
  const result = createEmptyExtraction();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cls = classifyLine(line);
    const timestamp = extractTimestamp(line);

    switch (cls) {
      case 'identificacao':
        // Aceitar variações comuns de identificação
        if (/^(nome|paciente|nome do paciente|nome completo)/i.test(line)) {
          result.identificacao.nome = line.replace(/^(nome|paciente|nome do paciente|nome completo)\s*[:\-]?\s*/i, '');
        }
        else if (/^(leito|quarto|aposento)/i.test(line)) {
          result.identificacao.leito = line.replace(/^(leito|quarto|aposento)\s*[:\-]?\s*/i, '');
        }
        else if (/^(conv[eê]nio|plano de sa[úu]de|operadora)/i.test(line)) {
          result.identificacao.convenio = line.replace(/^(conv[eê]nio|plano de sa[úu]de|operadora)\s*[:\-]?\s*/i, '');
        }
        else if (/^(dia de uti|d[úu]t[íi]|dia UTI)/i.test(line)) {
          result.identificacao.diaUTI = line.replace(/^(dia de uti|d[úu]t[íi]|dia UTI)\s*[:\-]?\s*/i, '');
        }
        else if (/^(data|hora|data e hora|data\/hora)/i.test(line)) {
          result.identificacao.dataHora = line.replace(/^(data|hora|data e hora|data\/hora)\s*[:\-]?\s*/i, '');
        }
        break;
      case 'subjetivo':
        if (/hda|hist[óo]ria da doen[çc]a/i.test(line)) result.subjetivo.hda.push(line);
        else if (/motivo/i.test(line)) result.subjetivo.motivoInternacao.push(line);
        else if (/antecedentes|pregressa/i.test(line)) result.subjetivo.antecedentes.push(line);
        else result.subjetivo.infoSubjetivaAtual.push(line);
        break;
      case 'sinaisVitais':
        result.sinaisVitais.push(line);
        break;
      case 'neurologico':
        result.neurologico.push(line);
        break;
      case 'cardiovascular':
        result.cardiovascular.push(line);
        break;
      case 'ventilacao':
        if (!result.ventilacao) result.ventilacao = {};
        if (/pcv|vcv|psv|bipap|cpap|vni|vpn/i.test(line)) result.ventilacao.modalidade = line;
        if (/fio2|fiO2/i.test(line)) result.ventilacao.fio2 = line;
        if (/peep|epap/i.test(line)) result.ventilacao.peep = line;
        if (/spo2/i.test(line)) result.ventilacao.spo2 = line;
        if (/gasometria|gaso|pco2|po2/i.test(line)) result.ventilacao.gasometria = line;
        if (/tot|tqt|traqueostomia|cateter|m[áa]scara/i.test(line)) result.ventilacao.interface = line;
        break;
      case 'respiratorio':
        result.respiratorio.push(line);
        break;
      case 'renal':
        result.renal.push(line);
        break;
      case 'gastrointestinal':
        result.gastrointestinal.push(line);
        break;
      case 'extremidades':
        result.extremidades.push(line);
        break;
      case 'dispositivos':
        result.dispositivos.push(line);
        break;
      case 'examesLab':
        result.examesLab.push({
          nome: line,
          valor: line,
          data: timestamp,
          source,
        });
        break;
      case 'microbiologia':
        // Detecta culturas positivas por palavras-chave ou microrganismos conhecidos
        const hasPositiveKeyword = /positiv[oa]|crescimento|isolad[oa]/i.test(line);
        const hasKnownMicroorganism = /kpc|mrsa|esbl|e\. coli|pseudomonas|acinetobacter|candida|enterobact|staphylococcus|streptococcus|klebsiella|proteus|serratia|enterococcus/i.test(line);
        const hasNegativeKeyword = /negativ[oa]|sem crescimento/i.test(line);
        const hasColonization = /coloniza/i.test(line);
        
        result.microbiologia.push({
          material: line,
          dataColeta: timestamp,
          situacao: (hasPositiveKeyword || hasKnownMicroorganism) ? 'positiva' : hasNegativeKeyword ? 'negativa' : hasColonization ? 'colonizacao' : 'pendente',
          source,
        });
        break;
      case 'medicamentos':
        result.medicamentos.push({
          nome: line,
          categoria: classifyMedication(line),
          source,
        });
        break;
      case 'diagnostico':
        const dx = extractDiagnosticoFromLine(line);
        if (dx) {
          if (/hip[óo]tese/i.test(line)) result.hipoteses.push(dx);
          else result.diagnosticos.push(dx);
        }
        break;
      case 'avaliacao':
        result.avaliacao.push(line);
        break;
      case 'plano':
        if (/antimicrobiano|antibi[óo]tico/i.test(line)) result.plano.antimicrobianos.push(line);
        else if (/ventilat|vm |weaning|desmame/i.test(line)) result.plano.suporteVentilatorio.push(line);
        else if (/hemodin|vasopressor|noradrenalina|volume/i.test(line)) result.plano.medidasHemodinamicas.push(line);
        else if (/renal|di[áa]lise|diurese|bhd/i.test(line)) result.plano.controleRenal.push(line);
        else if (/nutri|dieta|enteral|parenteral/i.test(line)) result.plano.nutricao.push(line);
        else if (/profilax|tevv|tepv|[úu]lcera/i.test(line)) result.plano.profilaxias.push(line);
        else if (/exame|interconsulta|solicitar|tc |rx |eco/i.test(line)) result.plano.examesInterconsultas.push(line);
        else if (/meta|alvo|objetivo/i.test(line)) result.plano.metasTerapeuticas.push(line);
        else if (/reavaliar|reavalia[çc][ãa]o/i.test(line)) result.plano.reavaliacoes.push(line);
        else result.plano.condutasPorProblema.push(line);
        break;
    }
  }

  return result;
}

function classifyMedication(line: string): Medicamento['categoria'] {
  const lower = line.toLowerCase();
  if (/antibi[óo]tico|meropenem|piperacilina|vancomicina|ceftriaxona|ciprofloxacino|linezolida|fluconazol|anfidoter|metronidazol/i.test(lower)) return 'antimicrobiano';
  if (/analg|sed|morfin|fentanil|metadona|propofol|midazolam|dexmedetomidina|cetamina|tramadol|dipirona|paracetamol/i.test(lower)) return 'analgesia-sedacao';
  if (/heparina|enoxaparina|anticoagula|rivaroxabana|apixabana|warfarin/i.test(lower)) return 'anticoagulacao';
  if (/omeprazol|pantoprazol|esomeprazol|famotidina|profilaxia de [úu]lcera/i.test(lower)) return 'profilaxia-ulcera';
  if (/insulina|nph|regular|glargina/i.test(lower)) return 'insulina';
  if (/vasopressor|noradrenalina|adrenalina|vasopressina|dobutamina|dopamina/i.test(lower)) return 'vasoativo';
  return 'outro';
}

function extractDiagnosticoFromLine(line: string): Diagnostico | null {
  let texto = line.replace(/^(dx:|dx |diagn[óo]stico|hip[óo]tese diagn[óo]stica|hip[óo]tese de|hip[óo]teses diagn[óo]sticas|problemas ativos|diagn[óo]sticos|cid)\s*[:\-]?\s*/i, '').trim();
  if (!texto) return null;
  const cidMatch = texto.match(/\(([A-Z]\d[\d.]*)\)/);
  const cid = cidMatch ? cidMatch[1] : '';
  if (cid) texto = texto.replace(/\([A-Z]\d[\d.]*\)/, '').trim();
  return { texto, cid, status: 'confirmado', source: 'texto-base' };
}

// ======================== ETAPA 3 & 4: NORMALIZAÇÃO E CONCILIAÇÃO ========================

function mergeDataPoints(existing: DataPoint[], incoming: DataPoint[]): DataPoint[] {
  // Remove duplicatas semânticas
  const seen = new Set<string>();
  const result: DataPoint[] = [];

  for (const dp of [...existing, ...incoming]) {
    const normalized = dp.value.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(dp);
    }
  }
  return result;
}

function reconcileSinaisVitais(base: string[], atual: string[]): { merged: string[]; conflitos: Conflito[] } {
  const conflitos: Conflito[] = [];
  
  // REGRA 1: Exame atual prevalece sobre histórico
  // Se há sinais vitais no exame atual, usar APENAS o atual
  if (atual.length > 0) {
    return { merged: atual, conflitos: [] };
  }
  
  // Se não há atual, usar o base (histórico)
  return { merged: base, conflitos: [] };
}

function isSameVitalSign(a: string, b: string): boolean {
  const params = ['pa:', 'ta:', 'pam:', 'fc:', 'fr:', 'temp:', 'temperatura', 'spo2', 'saturação'];
  for (const p of params) {
    if (a.startsWith(p) && b.startsWith(p)) return true;
  }
  return false;
}

function reconcileExamesLab(base: ExameLaboratorial[], atual: ExameLaboratorial[]): ExameLaboratorial[] {
  // Agrupa por nome do exame e mantém o mais recente
  const byName = new Map<string, ExameLaboratorial>();

  for (const ex of base) {
    byName.set(ex.nome.toLowerCase(), ex);
  }

  for (const ex of atual) {
    const key = ex.nome.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      // Se o atual tem data mais recente ou não há data no anterior, substitui
      if (ex.data && (!existing.data || ex.data > existing.data)) {
        ex.tendencia = 'novo';
        byName.set(key, ex);
      }
    } else {
      ex.tendencia = 'novo';
      byName.set(key, ex);
    }
  }

  return Array.from(byName.values());
}

function reconcileMedications(base: Medicamento[], atual: Medicamento[]): Medicamento[] {
  const byName = new Map<string, Medicamento>();

  for (const med of base) {
    byName.set(med.nome.toLowerCase(), med);
  }

  for (const med of atual) {
    byName.set(med.nome.toLowerCase(), med);
  }

  return Array.from(byName.values());
}

function reconcileCultures(base: Cultura[], atual: Cultura[]): Cultura[] {
  const byMaterial = new Map<string, Cultura>();

  for (const c of base) {
    byMaterial.set(c.material.toLowerCase(), c);
  }

  for (const c of atual) {
    const key = c.material.toLowerCase();
    if (byMaterial.has(key)) {
      // Atualiza com dados mais recentes
      byMaterial.set(key, c);
    } else {
      byMaterial.set(key, c);
    }
  }

  return Array.from(byMaterial.values());
}

function reconcileDiet(base: string[], atual: string[]): string[] {
  // Prioriza o valor atual quando há conflito de dieta
  const merged: string[] = [...base];
  
  for (const atualLine of atual) {
    // Verifica se é uma linha de dieta
    if (/dieta.*ml\/h/i.test(atualLine)) {
      let conflictFound = false;
      
      for (let i = 0; i < merged.length; i++) {
        // Verifica se ambos se referem a dieta
        if (/dieta.*ml\/h/i.test(merged[i])) {
          // Substitui pelo valor atual (prioriza informação atual)
          merged[i] = atualLine;
          conflictFound = true;
          break;
        }
      }
      
      if (!conflictFound) {
        merged.push(atualLine);
      }
    }
  }
  
  return merged;
}

// ======================== ETAPA 5: OBJETO CLÍNICO ESTRUTURADO ========================

function buildClinicalData(base: ExtractionResult, atual: ExtractionResult): { data: ClinicalData; conflitos: Conflito[] } {
  const conflitos: Conflito[] = [];

  // Identificação - prioriza exame atual se disponível
  const identificacao = {
    nome: atual.identificacao.nome ? { value: atual.identificacao.nome, source: 'exame-atual' as const } :
          base.identificacao.nome ? { value: base.identificacao.nome, source: 'texto-base' as const } : null,
    leito: atual.identificacao.leito ? { value: atual.identificacao.leito, source: 'exame-atual' as const } :
           base.identificacao.leito ? { value: base.identificacao.leito, source: 'texto-base' as const } : null,
    convenio: atual.identificacao.convenio ? { value: atual.identificacao.convenio, source: 'exame-atual' as const } :
              base.identificacao.convenio ? { value: base.identificacao.convenio, source: 'texto-base' as const } : null,
    dataHora: atual.identificacao.dataHora ? { value: atual.identificacao.dataHora, source: 'exame-atual' as const } :
              base.identificacao.dataHora ? { value: base.identificacao.dataHora, source: 'texto-base' as const } : null,
    diaUTI: atual.identificacao.diaUTI ? { value: atual.identificacao.diaUTI, source: 'exame-atual' as const } :
            base.identificacao.diaUTI ? { value: base.identificacao.diaUTI, source: 'texto-base' as const } : null,
  };

  // Subjetivo - merge
  const subjetivo = {
    hda: mergeDataPoints(
      base.subjetivo.hda.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.subjetivo.hda.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    motivoInternacao: mergeDataPoints(
      base.subjetivo.motivoInternacao.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.subjetivo.motivoInternacao.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    antecedentes: mergeDataPoints(
      base.subjetivo.antecedentes.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.subjetivo.antecedentes.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    eventosInternacao: mergeDataPoints(
      base.subjetivo.eventosInternacao.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.subjetivo.eventosInternacao.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    infoSubjetivaAtual: mergeDataPoints(
      base.subjetivo.infoSubjetivaAtual.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.subjetivo.infoSubjetivaAtual.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
  };

  // Sinais vitais - com conciliação de conflitos
  const svResult = reconcileSinaisVitais(base.sinaisVitais, atual.sinaisVitais);
  conflitos.push(...svResult.conflitos);

  // Objetivo - merge de cada seção
  const objetivo = {
    sinaisVitais: svResult.merged.map(v => ({ value: v, source: 'exame-atual' as const })),
    neurologico: mergeDataPoints(
      base.neurologico.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.neurologico.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    cardiovascular: mergeDataPoints(
      base.cardiovascular.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.cardiovascular.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    respiratorio: mergeDataPoints(
      base.respiratorio.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.respiratorio.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    renal: mergeDataPoints(
      base.renal.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.renal.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    gastrointestinal: reconcileDiet(
      base.gastrointestinal,
      atual.gastrointestinal
    ).map(v => ({ value: v, source: 'exame-atual' as const })),
    extremidades: mergeDataPoints(
      base.extremidades.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.extremidades.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    dispositivos: mergeDataPoints(
      base.dispositivos.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.dispositivos.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    examesLaboratoriais: reconcileExamesLab(base.examesLab, atual.examesLab),
    microbiologia: reconcileCultures(base.microbiologia, atual.microbiologia),
    tratamentos: reconcileMedications(base.medicamentos, atual.medicamentos),
    ventilacao: atual.ventilacao ? {
      tipo: classifyVentilationType(atual.ventilacao),
      modalidade: atual.ventilacao.modalidade,
      interface: atual.ventilacao.interface,
      fio2: atual.ventilacao.fio2,
      peep: atual.ventilacao.peep,
      spo2: atual.ventilacao.spo2,
      gasometria: atual.ventilacao.gasometria,
      source: 'exame-atual' as const,
    } : base.ventilacao ? {
      tipo: classifyVentilationType(base.ventilacao),
      modalidade: base.ventilacao.modalidade,
      interface: base.ventilacao.interface,
      fio2: base.ventilacao.fio2,
      peep: base.ventilacao.peep,
      spo2: base.ventilacao.spo2,
      gasometria: base.ventilacao.gasometria,
      source: 'texto-base' as const,
    } : null,
  };

  // Avaliação - merge
  const avaliacao = {
    sintese: mergeDataPoints(
      base.avaliacao.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.avaliacao.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    diagnosticos: [...base.diagnosticos, ...atual.diagnosticos],
    hipoteses: [...base.hipoteses, ...atual.hipoteses],
    evolucaoProblemas: [] as DataPoint[],
    pendencias: [] as DataPoint[],
  };

  // Geração automática de síntese se não houver avaliação explícita
  if (avaliacao.sintese.length === 0) {
    const problemas: string[] = [];
    
    // Listar diagnósticos
    if (avaliacao.diagnosticos.length > 0) {
      const dxList = avaliacao.diagnosticos.map(dx => dx.texto).join(', ');
      problemas.push(`Paciente com ${avaliacao.diagnosticos.length} diagnóstico(s) ativo(s): ${dxList}`);
    }
    
    // Listar suporte ventilatório
    if (objetivo.ventilacao && objetivo.ventilacao.tipo !== 'nenhum') {
      problemas.push(`Em suporte ventilatório: ${formatVentilationType(objetivo.ventilacao.tipo)}`);
    }
    
    // Listar anomalias laboratoriais
    const anemia = objetivo.examesLaboratoriais.find(e => /hemoglobina/i.test(e.nome) && parseFloat(e.valor) < 10);
    if (anemia) {
      problemas.push(`Anemia documentada (Hb ${anemia.valor})`);
    }
    
    const ira = objetivo.examesLaboratoriais.find(e => /creatinina/i.test(e.nome) && parseFloat(e.valor) > 1.5);
    if (ira) {
      problemas.push(`Disfunção renal documentada (Cr ${ira.valor})`);
    }
    
    // Listar infecções
    const culturaPositiva = objetivo.microbiologia.find(c => c.situacao === 'positiva');
    if (culturaPositiva) {
      problemas.push(`Infecção documentada: ${culturaPositiva.material}`);
    }
    
    if (problemas.length > 0) {
      avaliacao.sintese.push({
        value: problemas.join('. ') + '.',
        source: 'sistema' as const,
      });
    }
  }

  // Plano - merge por categoria
  const plano = {
    condutasPorProblema: mergeDataPoints(
      base.plano.condutasPorProblema.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.condutasPorProblema.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    antimicrobianos: mergeDataPoints(
      base.plano.antimicrobianos.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.antimicrobianos.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    suporteVentilatorio: mergeDataPoints(
      base.plano.suporteVentilatorio.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.suporteVentilatorio.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    medidasHemodinamicas: mergeDataPoints(
      base.plano.medidasHemodinamicas.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.medidasHemodinamicas.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    controleRenal: mergeDataPoints(
      base.plano.controleRenal.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.controleRenal.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    nutricao: mergeDataPoints(
      base.plano.nutricao.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.nutricao.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    profilaxias: mergeDataPoints(
      base.plano.profilaxias.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.profilaxias.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    examesInterconsultas: mergeDataPoints(
      base.plano.examesInterconsultas.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.examesInterconsultas.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    metasTerapeuticas: mergeDataPoints(
      base.plano.metasTerapeuticas.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.metasTerapeuticas.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
    reavaliacoes: mergeDataPoints(
      base.plano.reavaliacoes.map(v => ({ value: v, source: 'texto-base' as const })),
      atual.plano.reavaliacoes.map(v => ({ value: v, source: 'exame-atual' as const }))
    ),
  };

  const data: ClinicalData = {
    identificacao, subjetivo, objetivo, avaliacao, plano,
  };

  return { data, conflitos };
}

function classifyVentilationType(v: Partial<Ventilacao>): Ventilacao['tipo'] {
  const text = ((v.interface || '') + ' ' + (v.modalidade || '')).toLowerCase();
  if (/traqueostomia|tqt/.test(text)) {
    if (/vni|vpn|nao[- ]invasiva|espontâneo|espontanea/.test(text)) return 'espontanea-tqt';
    return 'invasiva-tqt';
  }
  if (/tot|orotraqueal|intub/.test(text)) return 'invasiva-tot';
  if (/vni|vpn|nao[- ]invasiva|bipap|cpap/.test(text)) return 'nao-invasiva';
  if (/cateter|cateter nasal|venturi|mask/.test(text)) return 'cateter-nasal';
  return 'nenhum';
}

// ======================== ETAPA 8: VALIDAÇÃO AUTOMÁTICA ========================

function generateAlerts(data: ClinicalData, conflitos: Conflito[]): Alerta[] {
  const alertas: Alerta[] = [];

  // Verifica identificação ausente
  if (!data.identificacao.nome) {
    alertas.push({ tipo: 'ausencia', severidade: 'warning', mensagem: 'Nome do paciente não identificado', campo: 'identificacao', resolvido: false });
  }
  if (!data.identificacao.leito) {
    alertas.push({ tipo: 'ausencia', severidade: 'info', mensagem: 'Leito não informado', campo: 'identificacao', resolvido: false });
  }

  // Verifica sinais vitais ausentes
  if (data.objetivo.sinaisVitais.length === 0) {
    alertas.push({ tipo: 'ausencia', severidade: 'warning', mensagem: 'Sinais vitais não documentados', campo: 'sinaisVitais', resolvido: false });
  }

  // Verifica avaliação vazia quando há problemas
  if (data.avaliacao.sintese.length === 0 && (data.avaliacao.diagnosticos.length > 0 || data.objetivo.sinaisVitais.length > 0)) {
    alertas.push({ tipo: 'ausencia', severidade: 'warning', mensagem: 'Avaliação clínica não documentada apesar de haver dados objetivos', campo: 'avaliacao', resolvido: false });
  }

  // Verifica diagnósticos sem plano
  if (data.avaliacao.diagnosticos.length > 0 && data.plano.condutasPorProblema.length === 0 && data.plano.antimicrobianos.length === 0) {
    alertas.push({ tipo: 'sem-plano', severidade: 'warning', mensagem: 'Diagnósticos documentados sem plano terapêutico correspondente', campo: 'plano', resolvido: false });
  }

  // Verifica hipóteses não confirmadas
  if (data.avaliacao.hipoteses.length > 0) {
    alertas.push({ tipo: 'hipotese', severidade: 'info', mensagem: `${data.avaliacao.hipoteses.length} hipótese(s) diagnóstica(s) precisam de confirmação`, campo: 'avaliacao', resolvido: false });
  }

  // Verifica conflitos
  for (const c of conflitos) {
    alertas.push({ tipo: 'conflito', severidade: 'warning', mensagem: `Conflito em ${c.campo}: "${c.valorAnterior}" vs "${c.valorAtual}"`, campo: c.campo, resolvido: c.resolvido });
  }

  // Verifica medicamentos com classificação potencialmente errada
  for (const med of data.objetivo.tratamentos) {
    if (/metadona|morfina|fentanil|tramadol/i.test(med.nome) && med.categoria !== 'analgesia-sedacao') {
      alertas.push({ tipo: 'classificacao', severidade: 'warning', mensagem: `"${med.nome}" classificado como profilaxia - verificar se é analgesia/sedação`, campo: 'medicamentos', resolvido: false });
    }
  }

  // Verifica exames laboratoriais sem data
  const examesSemData = data.objetivo.examesLaboratoriais.filter(e => !e.data);
  if (examesSemData.length > 0) {
    alertas.push({ tipo: 'incompleto', severidade: 'info', mensagem: `${examesSemData.length} exame(s) laboratorial(is) sem data documentada`, campo: 'examesLab', resolvido: false });
  }

  return alertas;
}

function validateFinal(data: ClinicalData): { passou: boolean; erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];

  // Verificações obrigatórias
  if (!data.identificacao.nome) erros.push('Identificação incompleta: nome ausente');
  if (data.objetivo.sinaisVitais.length === 0) avisos.push('Sinais vitais não documentados');
  if (data.avaliacao.sintese.length === 0 && data.avaliacao.diagnosticos.length === 0) avisos.push('Avaliação clínica não documentada');

  // Verifica duplicações
  const allText = [
    ...data.objetivo.sinaisVitais.map(d => d.value),
    ...data.objetivo.neurologico.map(d => d.value),
    ...data.objetivo.cardiovascular.map(d => d.value),
  ];
  const seen = new Set<string>();
  for (const t of allText) {
    const lower = t.toLowerCase();
    if (seen.has(lower)) {
      avisos.push(`Possível duplicação detectada: "${t}"`);
    }
    seen.add(lower);
  }

  return { passou: erros.length === 0, erros, avisos };
}

// ======================== ETAPA 7: GERAÇÃO DO SOAP FINAL ========================

// Função para deduplicar dados antes da geração final
function deduplicateFinalData(data: ClinicalData): ClinicalData {
  const newData = JSON.parse(JSON.stringify(data)) as ClinicalData;
  
  // Deduplicar sinais vitais
  const svSeen = new Set<string>();
  newData.objetivo.sinaisVitais = data.objetivo.sinaisVitais.filter((d: DataPoint) => {
    const key = d.value.toLowerCase().trim();
    if (svSeen.has(key)) return false;
    svSeen.add(key);
    return true;
  });
  
  // Deduplicar microbiologia (precauções)
  const microSeen = new Set<string>();
  newData.objetivo.microbiologia = data.objetivo.microbiologia.filter((c: Cultura) => {
    const key = c.material.toLowerCase().trim();
    if (microSeen.has(key)) return false;
    microSeen.add(key);
    return true;
  });
  
  // Deduplicar medicamentos
  const medSeen = new Set<string>();
  newData.objetivo.tratamentos = data.objetivo.tratamentos.filter((m: Medicamento) => {
    const key = m.nome.toLowerCase().trim();
    if (medSeen.has(key)) return false;
    medSeen.add(key);
    return true;
  });
  
  // Deduplicar neurológico com similaridade semântica
  const neuroSeen: string[] = [];
  newData.objetivo.neurologico = data.objetivo.neurologico.filter((d: DataPoint) => {
    const value = d.value.toLowerCase().trim();
    // Extrair componentes principais (Glasgow, RASS, pupilas)
    const glasgow = value.match(/glasgow\s+\d+/i)?.[0] || '';
    const rass = value.match(/rass\s+[\+\-]?\d+/i)?.[0] || '';
    const pupilas = value.match(/pupila[s]?\s+isoc[óo]ricas|pupila[s]?\s+anisoc[óo]ricas/i)?.[0] || '';
    const key = `${glasgow}|${rass}|${pupilas}`;
    
    // Verifica se já existe um registro similar
    for (const seen of neuroSeen) {
      if (seen === key || seen.includes(glasgow) && seen.includes(rass)) {
        return false; // Duplicata encontrada
      }
    }
    neuroSeen.push(key);
    return true;
  });
  
  // Deduplicar outras seções
  const sections = ['cardiovascular', 'respiratorio', 'renal', 'gastrointestinal', 'extremidades', 'dispositivos'] as const;
  for (const section of sections) {
    const seen = new Set<string>();
    newData.objetivo[section] = data.objetivo[section].filter((d: DataPoint) => {
      const key = d.value.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  return newData;
}

// Função para filtrar fragmentos de formulário
function filterFormFragments(data: ClinicalData): ClinicalData {
  const newData = JSON.parse(JSON.stringify(data)) as ClinicalData;
  
  const filterFragment = (value: string): boolean => {
    // Remover checkboxes não preenchidos (todos com espaço)
    if (/\([ ]\)/.test(value) && !/\(X\)/i.test(value)) return false;
    
    // Remover campos vazios de formulário (apenas label sem valor)
    if (/^[\w\s]+:\s*$/.test(value)) return false;
    
    // Remover linhas muito curtas sem significado clínico
    if (value.trim().length < 3) return false;
    
    return true;
  };
  
  // Aplicar filtro a todas as seções do objetivo
  const sections = ['sinaisVitais', 'neurologico', 'cardiovascular', 'respiratorio', 'renal', 'gastrointestinal', 'extremidades', 'dispositivos'] as const;
  for (const section of sections) {
    newData.objetivo[section] = data.objetivo[section].filter((d: DataPoint) => filterFragment(d.value));
  }
  
  return newData;
}

export function formatDiagnostico(dx: Diagnostico): string {
  let s = dx.texto;
  if (dx.cid) s += ` (${dx.cid})`;
  if (dx.status === 'hipotese') s += ' [hipótese]';
  return s;
}

export function formatSoapFinal(data: ClinicalData): string {
  // Aplicar filtragem e deduplicação antes de gerar o texto
  const filteredData = filterFormFragments(data);
  const finalData = deduplicateFinalData(filteredData);
  
  let o = '';
  o += '══════════════════════════════════════════════════\n';
  o += '            EVOLUÇÃO MÉDICA - UTI\n';
  o += '══════════════════════════════════════════════════\n\n';

  // IDENTIFICAÇÃO
  o += '▸ IDENTIFICAÇÃO\n';
  if (finalData.identificacao.nome) o += `  • Nome: ${finalData.identificacao.nome.value}\n`;
  if (finalData.identificacao.leito) o += `  • Leito: ${finalData.identificacao.leito.value}\n`;
  if (finalData.identificacao.convenio) o += `  • Convênio: ${finalData.identificacao.convenio.value}\n`;
  if (finalData.identificacao.diaUTI) o += `  • Dia de UTI: ${finalData.identificacao.diaUTI.value}\n`;
  if (finalData.identificacao.dataHora) o += `  • Data/Hora: ${finalData.identificacao.dataHora.value}\n`;
  o += '\n';

  // S - SUBJETIVO
  o += '───────────────────────────────────────────────\n';
  o += 'S — SUBJETIVO / CONTEXTO\n';
  o += '───────────────────────────────────────────────\n';
  if (finalData.subjetivo.hda.length > 0) {
    o += '  • História da Doença Atual:\n';
    finalData.subjetivo.hda.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.subjetivo.motivoInternacao.length > 0) {
    o += '  • Motivo da Internação:\n';
    finalData.subjetivo.motivoInternacao.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.subjetivo.antecedentes.length > 0) {
    o += '  • Antecedentes Relevantes:\n';
    finalData.subjetivo.antecedentes.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.subjetivo.eventosInternacao.length > 0) {
    o += '  • Eventos da Internação:\n';
    finalData.subjetivo.eventosInternacao.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.subjetivo.infoSubjetivaAtual.length > 0) {
    o += '  • Informações Subjetivas Atuais:\n';
    finalData.subjetivo.infoSubjetivaAtual.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.subjetivo.hda.length === 0 && finalData.subjetivo.motivoInternacao.length === 0 && finalData.subjetivo.antecedentes.length === 0 && finalData.subjetivo.eventosInternacao.length === 0 && finalData.subjetivo.infoSubjetivaAtual.length === 0) {
    o += '  Paciente internado em UTI, sem informações subjetivas disponíveis no momento.\n';
  }
  o += '\n';

  // O - OBJETIVO
  o += '───────────────────────────────────────────────\n';
  o += 'O — OBJETIVO\n';
  o += '───────────────────────────────────────────────\n\n';

  // 1. Sinais vitais
  if (finalData.objetivo.sinaisVitais.length > 0) {
    o += '  1. Sinais Vitais:\n';
    finalData.objetivo.sinaisVitais.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 2. Neurológico
  if (finalData.objetivo.neurologico.length > 0) {
    o += '  2. Avaliação Neurológica:\n';
    finalData.objetivo.neurologico.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 3. Cardiovascular
  if (finalData.objetivo.cardiovascular.length > 0) {
    o += '  3. Avaliação Cardiovascular:\n';
    finalData.objetivo.cardiovascular.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 4. Respiratório
  if (finalData.objetivo.respiratorio.length > 0 || finalData.objetivo.ventilacao) {
    o += '  4. Avaliação Respiratória e Ventilatória:\n';
    if (finalData.objetivo.ventilacao) {
      o += `     • Tipo: ${formatVentilationType(finalData.objetivo.ventilacao.tipo)}\n`;
      if (finalData.objetivo.ventilacao.modalidade) o += `     • ${finalData.objetivo.ventilacao.modalidade}\n`;
      if (finalData.objetivo.ventilacao.fio2) o += `     • ${finalData.objetivo.ventilacao.fio2}\n`;
      if (finalData.objetivo.ventilacao.peep) o += `     • ${finalData.objetivo.ventilacao.peep}\n`;
      if (finalData.objetivo.ventilacao.spo2) o += `     • ${finalData.objetivo.ventilacao.spo2}\n`;
      if (finalData.objetivo.ventilacao.gasometria) o += `     • ${finalData.objetivo.ventilacao.gasometria}\n`;
    }
    finalData.objetivo.respiratorio.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 5. Renal
  if (finalData.objetivo.renal.length > 0) {
    o += '  5. Avaliação Renal e Balanço Hídrico:\n';
    finalData.objetivo.renal.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 6. Gastrointestinal
  if (finalData.objetivo.gastrointestinal.length > 0) {
    o += '  6. Avaliação Gastrointestinal e Nutricional:\n';
    finalData.objetivo.gastrointestinal.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 7. Extremidades
  if (finalData.objetivo.extremidades.length > 0) {
    o += '  7. Extremidades, Perfusão e Pele:\n';
    finalData.objetivo.extremidades.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 8. Dispositivos
  if (finalData.objetivo.dispositivos.length > 0) {
    o += '  8. Dispositivos Invasivos:\n';
    finalData.objetivo.dispositivos.forEach(d => o += `     ${d.value}\n`);
    o += '\n';
  }

  // 9. Exames laboratoriais
  if (finalData.objetivo.examesLaboratoriais.length > 0) {
    o += '  9. Exames Laboratoriais:\n';
    // Agrupa por data se disponível
    const byDate = new Map<string, ExameLaboratorial[]>();
    for (const ex of finalData.objetivo.examesLaboratoriais) {
      const key = ex.data || 'sem-data';
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(ex);
    }
    for (const [date, exames] of byDate) {
      if (date !== 'sem-data') o += `     [${date}]\n`;
      exames.forEach(ex => o += `     • ${ex.nome}\n`);
    }
    o += '\n';
  }

  // 10. Microbiologia
  if (finalData.objetivo.microbiologia.length > 0) {
    o += '  10. Microbiologia e Culturas:\n';
    finalData.objetivo.microbiologia.forEach(c => {
      o += `     • Material: ${c.material}\n`;
      if (c.dataColeta) o += `       Data da coleta: ${c.dataColeta}\n`;
      if (c.microrganismo) o += `       Microrganismo: ${c.microrganismo}\n`;
      if (c.resistencia) o += `       Resistência: ${c.resistencia}\n`;
      o += `       Situação: ${c.situacao}\n`;
      if (c.tratamentoAssociado) o += `       Tratamento: ${c.tratamentoAssociado}\n`;
    });
    o += '\n';
  }

  // 11. Tratamentos
  if (finalData.objetivo.tratamentos.length > 0) {
    o += '  11. Tratamentos Relevantes em Andamento:\n';
    // Agrupa por categoria
    const byCategory = new Map<string, Medicamento[]>();
    for (const med of finalData.objetivo.tratamentos) {
      if (!byCategory.has(med.categoria)) byCategory.set(med.categoria, []);
      byCategory.get(med.categoria)!.push(med);
    }
    const categoryLabels: Record<string, string> = {
      'antimicrobiano': 'Antimicrobianos',
      'analgesia-sedacao': 'Analgesia e Sedação',
      'anticoagulacao': 'Anticoagulação / Profilaxia de TEV',
      'profilaxia-ulcera': 'Profilaxia de Úlcera de Estresse',
      'insulina': 'Insulinoterapia',
      'vasoativo': 'Drogas Vasoativas',
      'outro': 'Outros',
    };
    for (const [cat, meds] of byCategory) {
      o += `     ${categoryLabels[cat] || cat}:\n`;
      meds.forEach(m => o += `       • ${m.nome}\n`);
    }
    o += '\n';
  }

  // A - AVALIAÇÃO
  o += '───────────────────────────────────────────────\n';
  o += 'A — AVALIAÇÃO\n';
  o += '───────────────────────────────────────────────\n';
  if (finalData.avaliacao.sintese.length > 0) {
    o += '  • Síntese Clínica:\n';
    finalData.avaliacao.sintese.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.avaliacao.diagnosticos.length > 0) {
    o += '  • Diagnósticos e Problemas Ativos:\n';
    finalData.avaliacao.diagnosticos.forEach((dx, i) => o += `    ${i + 1}. ${formatDiagnostico(dx)}\n`);
  }
  if (finalData.avaliacao.hipoteses.length > 0) {
    o += '  • Hipóteses Diagnósticas:\n';
    finalData.avaliacao.hipoteses.forEach((dx, i) => o += `    ${i + 1}. ${formatDiagnostico(dx)}\n`);
  }
  if (finalData.avaliacao.evolucaoProblemas.length > 0) {
    o += '  • Evolução dos Principais Problemas:\n';
    finalData.avaliacao.evolucaoProblemas.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.avaliacao.pendencias.length > 0) {
    o += '  • Pendências:\n';
    finalData.avaliacao.pendencias.forEach(d => o += `    ${d.value}\n`);
  }
  if (finalData.avaliacao.sintese.length === 0 && finalData.avaliacao.diagnosticos.length === 0 && finalData.avaliacao.hipoteses.length === 0) {
    o += '  Avaliação clínica não documentada.\n';
  }
  o += '\n';

  // P - PLANO
  o += '───────────────────────────────────────────────\n';
  o += 'P — PLANO\n';
  o += '───────────────────────────────────────────────\n';
  const planoSections = [
    { label: 'Condutas por Problema', items: finalData.plano.condutasPorProblema },
    { label: 'Antimicrobianos', items: finalData.plano.antimicrobianos },
    { label: 'Suporte Ventilatório', items: finalData.plano.suporteVentilatorio },
    { label: 'Medidas Hemodinâmicas', items: finalData.plano.medidasHemodinamicas },
    { label: 'Controle Renal e Metabólico', items: finalData.plano.controleRenal },
    { label: 'Nutrição', items: finalData.plano.nutricao },
    { label: 'Profilaxias', items: finalData.plano.profilaxias },
    { label: 'Exames e Interconsultas', items: finalData.plano.examesInterconsultas },
    { label: 'Metas Terapêuticas', items: finalData.plano.metasTerapeuticas },
    { label: 'Reavaliações Programadas', items: finalData.plano.reavaliacoes },
  ];
  let hasPlano = false;
  for (const sec of planoSections) {
    if (sec.items.length > 0) {
      hasPlano = true;
      o += `  • ${sec.label}:\n`;
      sec.items.forEach(d => o += `    ${d.value}\n`);
    }
  }
  if (!hasPlano) o += '  Plano não documentado.\n';
  o += '\n';
  o += '══════════════════════════════════════════════════\n';

  return o;
}

export function formatSoapSimple(data: ClinicalData): string {
  let o = '';
  o += 'EVOLUÇÃO MÉDICA - UTI\n\n';

  if (data.identificacao.nome) o += `Paciente: ${data.identificacao.nome.value}\n`;
  if (data.identificacao.leito) o += `Leito: ${data.identificacao.leito.value}\n`;
  if (data.identificacao.diaUTI) o += `Dia de UTI: ${data.identificacao.diaUTI.value}\n`;
  if (data.identificacao.dataHora) o += `Data/Hora: ${data.identificacao.dataHora.value}\n`;
  o += '\n';

  if (data.avaliacao.diagnosticos.length > 0) {
    o += 'DX ADMISSÃO:\n';
    data.avaliacao.diagnosticos.forEach((dx, i) => o += `${i + 1}. ${formatDiagnostico(dx)}\n`);
    o += '\n';
  }

  o += 'S - SUBJETIVO:\n';
  const subItems = [...data.subjetivo.hda, ...data.subjetivo.motivoInternacao, ...data.subjetivo.antecedentes, ...data.subjetivo.eventosInternacao, ...data.subjetivo.infoSubjetivaAtual];
  if (subItems.length > 0) subItems.forEach(d => o += `${d.value}\n`);
  else o += 'Sem informações subjetivas disponíveis.\n';
  o += '\n';

  o += 'O - OBJETIVO:\n';
  if (data.objetivo.sinaisVitais.length > 0) { o += 'SV: '; data.objetivo.sinaisVitais.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.neurologico.length > 0) { o += 'Neurol: '; data.objetivo.neurologico.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.cardiovascular.length > 0) { o += 'CV: '; data.objetivo.cardiovascular.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.respiratorio.length > 0) { o += 'Resp: '; data.objetivo.respiratorio.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.ventilacao) { o += `Vent: ${formatVentilationType(data.objetivo.ventilacao.tipo)} ${data.objetivo.ventilacao.modalidade || ''}\n`; }
  if (data.objetivo.renal.length > 0) { o += 'Renal: '; data.objetivo.renal.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.gastrointestinal.length > 0) { o += 'GI: '; data.objetivo.gastrointestinal.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.extremidades.length > 0) { o += 'Extrem: '; data.objetivo.extremidades.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.dispositivos.length > 0) { o += 'Disp: '; data.objetivo.dispositivos.forEach(d => o += `${d.value} `); o += '\n'; }
  if (data.objetivo.examesLaboratoriais.length > 0) { o += 'ExLab: '; data.objetivo.examesLaboratoriais.slice(0, 5).forEach(e => o += `${e.nome}; `); o += '\n'; }
  if (data.objetivo.microbiologia.length > 0) { o += 'Micro: '; data.objetivo.microbiologia.forEach(c => o += `${c.material}(${c.situacao}); `); o += '\n'; }
  o += '\n';

  o += 'A - AVALIAÇÃO:\n';
  if (data.avaliacao.sintese.length > 0) data.avaliacao.sintese.forEach(d => o += `${d.value}\n`);
  else o += 'Não documentada.\n';
  o += '\n';

  o += 'P - PLANO:\n';
  const planoItems = [...data.plano.condutasPorProblema, ...data.plano.antimicrobianos, ...data.plano.suporteVentilatorio, ...data.plano.medidasHemodinamicas, ...data.plano.controleRenal, ...data.plano.nutricao, ...data.plano.profilaxias, ...data.plano.examesInterconsultas, ...data.plano.metasTerapeuticas, ...data.plano.reavaliacoes];
  if (planoItems.length > 0) planoItems.forEach(d => o += `${d.value}\n`);
  else o += 'Não documentado.\n';

  return o;
}

function formatVentilationType(tipo: Ventilacao['tipo']): string {
  const labels: Record<string, string> = {
    'invasiva-tot': 'Ventilação Invasiva (TOT)',
    'invasiva-tqt': 'Ventilação Invasiva (Traqueostomia)',
    'nao-invasiva': 'Ventilação Não Invasiva',
    'espontanea-tqt': 'Respiração Espontânea (Traqueostomia)',
    'cateter-nasal': 'Oxigenioterapia (Cateter Nasal)',
    'nenhum': 'Sem suporte ventilatório',
  };
  return labels[tipo] || tipo;
}

// ======================== API PRINCIPAL ========================

export function processEvolution(textoBase: string, exameAtual: string): ProcessedEvolution {
  // ETAPA 1: Extração do texto-base
  const baseExtracted = extractFromText(textoBase, 'texto-base');

  // ETAPA 2: Extração do exame atual
  const atualExtracted = extractFromText(exameAtual, 'exame-atual');

  // ETAPA 3, 4, 5: Normalização, conciliação e construção do objeto clínico
  const { data, conflitos } = buildClinicalData(baseExtracted, atualExtracted);

  // ETAPA 8: Geração de alertas e validação
  const alertas = generateAlerts(data, conflitos);
  const validacaoFinal = validateFinal(data);

  return { data, alertas, conflitos, validacaoFinal };
}
