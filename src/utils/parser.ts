export interface SoapData {
  identificacao: string;
  diagnosticoAdmissao: string;
  subjetivo: string;
  objetivo: {
    sinaisVitais: string;
    hemodinamica: string;
    respiratorio: string;
    neurologico: string;
    renal: string;
    gastrointestinal: string;
    hematologico: string;
    infectologico: string;
    metabolico: string;
    examesLaboratoriais: string;
    dispositivos: string;
    escores: string;
  };
  avaliacao: string;
  plano: string;
  informacoesAdicionais: string;
}

export function createEmptySoap(): SoapData {
  return {
    identificacao: '',
    diagnosticoAdmissao: '',
    subjetivo: '',
    objetivo: {
      sinaisVitais: '',
      hemodinamica: '',
      respiratorio: '',
      neurologico: '',
      renal: '',
      gastrointestinal: '',
      hematologico: '',
      infectologico: '',
      metabolico: '',
      examesLaboratoriais: '',
      dispositivos: '',
      escores: '',
    },
    avaliacao: '',
    plano: '',
    informacoesAdicionais: '',
  };
}

function extractSection(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  const results: string[] = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    for (const keyword of keywords) {
      if (lowerLine.includes(keyword.toLowerCase())) {
        results.push(line.trim());
        break;
      }
    }
  }
  
  return results.join('\n');
}

function extractByHeader(text: string, header: string): string {
  const lines = text.split('\n');
  let capturing = false;
  const results: string[] = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    if (lowerLine.includes(header.toLowerCase())) {
      capturing = true;
      continue;
    }
    if (capturing) {
      // Stop if we hit another header-like line
      if (/^(sv|hv|resp|neuro|renal|gi|hemato|infect|metab|exame|disposit|escore|plano|avalia|subjetivo|objetivo|identifica|diagn)/i.test(line.trim()) && line.trim().length < 50) {
        break;
      }
      if (line.trim()) {
        results.push(line.trim());
      }
    }
  }
  
  return results.join('\n');
}

export function parseRawText(rawText: string, additionalInfo: string): SoapData {
  const soap = createEmptySoap();
  
  // Parse identification
  const idKeywords = ['paciente', 'nome', 'idade', 'leito', 'quarto', 'prontuário', 'internação', 'dia de uti', 'dx de admissão', 'diagnóstico de admissão'];
  soap.identificacao = extractSection(rawText, idKeywords);
  
  // Parse admission diagnosis
  const dxKeywords = ['dx de admissão', 'diagnóstico de admissão', 'diagnostico de admissao', 'motivo internação', 'motivo da internação', 'causa internação'];
  soap.diagnosticoAdmissao = extractSection(rawText, dxKeywords);
  
  // Parse subjective
  const subKeywords = ['subjetivo', 'queixa', 'história', 'historia', 'relata', 'refere', 'acompanhante', 'família', 'sintoma'];
  soap.subjetivo = extractSection(rawText, subKeywords);
  
  // Parse objective - Sinais vitais
  const svKeywords = ['pa', 'pressão arterial', 'fc', 'frequência cardíaca', 'fr', 'frequência respiratória', 'temp', 'temperatura', 'spo2', 'saturação', 'saturacao', 'tmax', 'sinais vitais', 'ta:', 'pam'];
  soap.objetivo.sinaisVitais = extractSection(rawText, svKeywords);
  
  // Parse objective - Hemodynamics
  const hemoKeywords = ['hemodinâmica', 'hemodinamica', 'vasopressor', 'noradrenalina', 'adrenalina', 'vasopressina', 'dobutamina', 'débito cardíaco', 'picc', 'cvc', 'pvc', 'vc'];
  soap.objetivo.hemodinamica = extractSection(rawText, hemoKeywords);
  
  // Parse objective - Respiratory
  const respKeywords = ['respiratório', 'respiratorio', 'vm', 'ventilação', 'ventilacao', 'ventilatório', 'ventilatorio', 'peep', 'fio2', 'fiO2', 'pplat', 'pico', 'volumes correntes', 'weaning', 'extubação', 'extubacao', 'traqueostomia', 'traqueo', 'oxigênio', 'oxigenio', 'cânula', 'canula', 'ar', 'gasometria', 'pco2', 'po2', 'ph', 'hco3', 'be ', 'base excess'];
  soap.objetivo.respiratorio = extractSection(rawText, respKeywords);
  
  // Parse objective - Neurological
  const neuroKeywords = ['neurológico', 'neurologico', 'glow', 'glasgow', 'pupilas', 'sedação', 'sedacao', 'rass', 'richmond', 'delirium', 'cam-icu', 'convulsão', 'convulsao', 'focalidade', 'marcha', 'força', 'paresia', 'paresi', 'movimentação', 'movimentacao', 'midríase', 'miodriase', 'isocóricas', 'isocoricas', 'anisocoria'];
  soap.objetivo.neurologico = extractSection(rawText, neuroKeywords);
  
  // Parse objective - Renal
  const renalKeywords = ['renal', 'diurese', 'urina', 'creatinina', 'ureia', 'tfg', 'filtração', 'filtracao', 'hemodiálise', 'hemodialise', 'crrt', 'tdc', 'catheter', 'cateter', 'rim', 'edema', 'balanço hídrico', 'balanco hidrico', 'bhd', 'volume total'];
  soap.objetivo.renal = extractSection(rawText, renalKeywords);
  
  // Parse objective - Gastrointestinal
  const giKeywords = ['gastrointestinal', 'gi:', 'hepático', 'hepatico', 'abdome', 'abdominal', 'dieta', 'nutrição', 'nutricao', 'sng', 'sngt', 'deito', 'evacuação', 'evacuacao', 'fezes', 'vísceras', 'visceras', 'tgp', 'tgo', 'bilirrubina', 'albumina', 'ascite', 'distensão', 'distencao', 'rha', 'ruídos hidroaéreos', 'nausea', 'vômito', 'vomito'];
  soap.objetivo.gastrointestinal = extractSection(rawText, giKeywords);
  
  // Parse objective - Hematological
  const hemaKeywords = ['hematológico', 'hematologico', 'hema', 'hb:', 'hgb', 'hemoglobina', 'hematócrito', 'hematocrito', 'ht:', 'plaquetas', 'leucócitos', 'leucocitos', 'coagulograma', 'inr', 'tpa', 'fibrinogênio', 'fibrinogenio', 'd-dímero', 'ddimer', 'transfusão', 'transfusao', 'anemia', 'sangramento', 'hemorragia'];
  soap.objetivo.hematologico = extractSection(rawText, hemaKeywords);
  
  // Parse objective - Infectious
  const infKeywords = ['infecto', 'infecção', 'infeccao', 'procalcitonina', 'pcr ', 'crp', 'cultura', 'hemocultura', 'antibiótico', 'antibiotico', 'meropenem', 'piperacilina', 'vancomicina', 'febre', 'foco infeccioso', 'sepsis', 'sépsis', 'choque séptico', 'septic', 'pct'];
  soap.objetivo.infectologico = extractSection(rawText, infKeywords);
  
  // Parse objective - Metabolic
  const metKeywords = ['metabólico', 'metabolico', 'glicemia', 'glicose', 'insulina', 'sódio', 'sodio', 'potássio', 'potassio', 'cálcio', 'calcio', 'magnésio', 'magnesio', 'fosfato', 'lactato', 'ph ', 'acidose', 'alcalose', 'eletrólitos', 'elektrolit', 'ionograma', 'lact', 'na ', 'k ', 'cl '];
  soap.objetivo.metabolico = extractSection(rawText, metKeywords);
  
  // Parse exams
  const examKeywords = ['exame', 'laboratório', 'laboratorio', 'tc ', 'raio-x', 'raio x', 'rx ', 'usg', 'ecocardiograma', 'eco ', 'tomografia', 'ultrassom', 'biópsia', 'biopsia', 'resultado', 'dosagem', 'nível', 'nivel'];
  soap.objetivo.examesLaboratoriais = extractSection(rawText, examKeywords);
  
  // Parse devices
  const devKeywords = ['dispositivo', 'cateter', 'dreno', 'sonda', 'cvc ', 'picc', 'jal', 'sv ', 'arterial', 'balão', 'balao', 'máscara', 'mascara', 'vmi', 'vm ', 'iot', 'tqt', 'acesso venoso', 'acesso arterial'];
  soap.objetivo.dispositivos = extractSection(rawText, devKeywords);
  
  // Parse scores
  const scoreKeywords = ['escore', 'sofa', 'apache', 'glasgow', 'rass', 'richmond', 'cam-icu', 'qsofa', 'q-sofa', 'kidigo', 'mlds', 'score'];
  soap.objetivo.escores = extractSection(rawText, scoreKeywords);
  
  // Parse assessment
  const avalKeywords = ['avaliação', 'avaliacao', 'hipótese', 'hipotese', 'diagnóstico', 'diagnostico', 'dx:', 'quadro', 'evolução', 'evolucao', 'melhora', 'piora', 'estável', 'estavel', 'grave', 'crítico', 'critico', 'resolutividade', 'resposta terapêutica', 'resposta terapeutica'];
  soap.avaliacao = extractSection(rawText, avalKeywords);
  
  // Parse plan
  const planKeywords = ['plano', 'conduta', 'prescrição', 'prescricao', 'medicação', 'medicacao', 'droga', 'ajuste', 'manter', 'suspender', 'iniciar', 'trocar', 'incluir', 'excluir', 'meta', 'objetivo', 'proposta', 'solicitar', 'interconsulta', 'procedimento'];
  soap.plano = extractSection(rawText, planKeywords);
  
  // Apply additional info - this overrides/supplements the parsed data
  if (additionalInfo.trim()) {
    soap.informacoesAdicionais = additionalInfo.trim();
    
    // Try to override specific sections based on additional info content
    const additionalLower = additionalInfo.toLowerCase();
    
    // Check if additional info contains section headers
    if (additionalLower.includes('sv:') || additionalLower.includes('sinais vitais')) {
      const svSection = extractByHeader(additionalInfo, 'sv:') || extractByHeader(additionalInfo, 'sinais vitais');
      if (svSection) soap.objetivo.sinaisVitais = svSection;
    }
    
    if (additionalLower.includes('plano:') || additionalLower.includes('conduta')) {
      const planSection = extractByHeader(additionalInfo, 'plano:') || extractByHeader(additionalInfo, 'conduta');
      if (planSection) soap.plano = planSection;
    }
    
    if (additionalLower.includes('avaliação:') || additionalLower.includes('avaliacao:')) {
      const avalSection = extractByHeader(additionalInfo, 'avaliação:') || extractByHeader(additionalInfo, 'avaliacao:');
      if (avalSection) soap.avaliacao = avalSection;
    }
  }
  
  return soap;
}

export function formatSoapForDisplay(soap: SoapData): string {
  let output = '';
  
  output += '═══════════════════════════════════════\n';
  output += '         EVOLUÇÃO MÉDICA - UTI\n';
  output += '═══════════════════════════════════════\n\n';
  
  if (soap.identificacao) {
    output += '▸ IDENTIFICAÇÃO:\n';
    output += soap.identificacao + '\n\n';
  }
  
  if (soap.diagnosticoAdmissao) {
    output += '▸ DIAGNÓSTICO DE ADMISSÃO:\n';
    output += soap.diagnosticoAdmissao + '\n\n';
  }
  
  output += '───────────────────────────────────────\n';
  output += 'S - SUBJETIVO\n';
  output += '───────────────────────────────────────\n';
  output += (soap.subjetivo || 'Não informado') + '\n\n';
  
  output += '───────────────────────────────────────\n';
  output += 'O - OBJETIVO\n';
  output += '───────────────────────────────────────\n\n';
  
  if (soap.objetivo.sinaisVitais) {
    output += '  • Sinais Vitais:\n';
    output += '    ' + soap.objetivo.sinaisVitais.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.hemodinamica) {
    output += '  • Hemodinâmica:\n';
    output += '    ' + soap.objetivo.hemodinamica.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.respiratorio) {
    output += '  • Respiratório:\n';
    output += '    ' + soap.objetivo.respiratorio.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.neurologico) {
    output += '  • Neurológico:\n';
    output += '    ' + soap.objetivo.neurologico.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.renal) {
    output += '  • Renal:\n';
    output += '    ' + soap.objetivo.renal.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.gastrointestinal) {
    output += '  • Gastrointestinal/Hepático:\n';
    output += '    ' + soap.objetivo.gastrointestinal.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.hematologico) {
    output += '  • Hematológico:\n';
    output += '    ' + soap.objetivo.hematologico.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.infectologico) {
    output += '  • Infectológico:\n';
    output += '    ' + soap.objetivo.infectologico.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.metabolico) {
    output += '  • Metabólico:\n';
    output += '    ' + soap.objetivo.metabolico.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.examesLaboratoriais) {
    output += '  • Exames Complementares:\n';
    output += '    ' + soap.objetivo.examesLaboratoriais.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.dispositivos) {
    output += '  • Dispositivos:\n';
    output += '    ' + soap.objetivo.dispositivos.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  if (soap.objetivo.escores) {
    output += '  • Escores:\n';
    output += '    ' + soap.objetivo.escores.replace(/\n/g, '\n    ') + '\n\n';
  }
  
  output += '───────────────────────────────────────\n';
  output += 'A - AVALIAÇÃO\n';
  output += '───────────────────────────────────────\n';
  output += (soap.avaliacao || 'Não informado') + '\n\n';
  
  output += '───────────────────────────────────────\n';
  output += 'P - PLANO\n';
  output += '───────────────────────────────────────\n';
  output += (soap.plano || 'Não informado') + '\n\n';
  
  if (soap.informacoesAdicionais) {
    output += '───────────────────────────────────────\n';
    output += '▸ INFORMAÇÕES ADICIONAIS\n';
    output += '───────────────────────────────────────\n';
    output += soap.informacoesAdicionais + '\n\n';
  }
  
  output += '═══════════════════════════════════════\n';
  
  return output;
}

export function formatSoapSimple(soap: SoapData): string {
  let output = '';
  
  output += 'EVOLUÇÃO MÉDICA - UTI\n\n';
  
  if (soap.identificacao) {
    output += 'IDENTIFICAÇÃO:\n' + soap.identificacao + '\n\n';
  }
  
  if (soap.diagnosticoAdmissao) {
    output += 'DIAGNÓSTICO DE ADMISSÃO:\n' + soap.diagnosticoAdmissao + '\n\n';
  }
  
  output += 'S - SUBJETIVO:\n' + (soap.subjetivo || '-') + '\n\n';
  
  output += 'O - OBJETIVO:\n';
  if (soap.objetivo.sinaisVitais) output += 'SV: ' + soap.objetivo.sinaisVitais + '\n';
  if (soap.objetivo.hemodinamica) output += 'Hemodinâmica: ' + soap.objetivo.hemodinamica + '\n';
  if (soap.objetivo.respiratorio) output += 'Respiratório: ' + soap.objetivo.respiratorio + '\n';
  if (soap.objetivo.neurologico) output += 'Neurológico: ' + soap.objetivo.neurologico + '\n';
  if (soap.objetivo.renal) output += 'Renal: ' + soap.objetivo.renal + '\n';
  if (soap.objetivo.gastrointestinal) output += 'GI: ' + soap.objetivo.gastrointestinal + '\n';
  if (soap.objetivo.hematologico) output += 'Hematológico: ' + soap.objetivo.hematologico + '\n';
  if (soap.objetivo.infectologico) output += 'Infecto: ' + soap.objetivo.infectologico + '\n';
  if (soap.objetivo.metabolico) output += 'Metabólico: ' + soap.objetivo.metabolico + '\n';
  if (soap.objetivo.examesLaboratoriais) output += 'Exames: ' + soap.objetivo.examesLaboratoriais + '\n';
  if (soap.objetivo.dispositivos) output += 'Dispositivos: ' + soap.objetivo.dispositivos + '\n';
  if (soap.objetivo.escores) output += 'Escores: ' + soap.objetivo.escores + '\n';
  
  output += '\nA - AVALIAÇÃO:\n' + (soap.avaliacao || '-') + '\n\n';
  output += 'P - PLANO:\n' + (soap.plano || '-') + '\n';
  
  return output;
}
