import { useState } from 'react';
import { processEvolution, formatSoapFinal } from './utils/soap-engine';

export default function AuditTest() {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const textoBase = `
Paciente: João Silva
Leito: 302
Convênio: Unimed
Dia de UTI: 5

DX: Choque séptico de foco pulmonar (A41.9)

SV: PA 100/50 mmHg, FC 110 bpm, FR 24, Temp 38.5°C, SpO2 92%
Hemodinâmica: Noradrenalina 0.2 mcg/kg/min
Respiratório: VM PCV, PEEP 10, FiO2 60%
Neurológico: Glasgow 13, RASS -2
Renal: Diurese 400ml/24h, Cr 2.8 mg/dL
Hemoglobina: 7.2 g/dL
Creatinina: 2.8 mg/dL (25/01/2024)
PCR: 180 mg/L
Hemocultura: KPC positiva (25/01/2024)
Meropenem 1g EV 8/8h (início 25/01/2024)
Edema MMSS 2+/4
Precaução de contato para KPC

Avaliação: Paciente grave, em choque séptico, com disfunção renal
Plano: Manter meropenem, otimizar volume, reavaliar em 6h
`;

  const exameAtual = `
PA: 150/70 mmHg
FC: 88 bpm
AC: RCR 2T, BNF, sem sopros
AP: MV+ bilateral, sem RA
Abdome: plano, flácido, RHA+, indolor
Neurológico: Glasgow 15, RASS 0, pupilas isocóricas reativas
Extremidades: perfusão preservada, sem edema em membros superiores
Diurese: 1200ml/24h
Hemoglobina: 10.2 g/dL (28/01/2024)
Creatinina: 1.5 mg/dL (28/01/2024)
PCR: 45 mg/L (28/01/2024)
Meropenem 1g EV 8/8h (D4)
Sem edema em MMSS
Precaução de contato para KPC

Plano: Suspender noradrenalina, manter meropenem, iniciar dieta oral
`;

  const runAudit = () => {
    const result = processEvolution(textoBase, exameAtual);
    
    const analysis = {
      // Dados extraídos
      identificacao: result.data.identificacao,
      diagnosticos: result.data.avaliacao.diagnosticos.length,
      sinaisVitais: result.data.objetivo.sinaisVitais.length,
      cardiovascular: result.data.objetivo.cardiovascular.length,
      respiratorio: result.data.objetivo.respiratorio.length,
      neurologico: result.data.objetivo.neurologico.length,
      renal: result.data.objetivo.renal.length,
      examesLab: result.data.objetivo.examesLaboratoriais.length,
      microbiologia: result.data.objetivo.microbiologia.length,
      medicamentos: result.data.objetivo.tratamentos.length,
      avaliacao: result.data.avaliacao.sintese.length,
      
      // Verificações específicas
      acCapturado: result.data.objetivo.cardiovascular.some(d => /AC:|RCR/i.test(d.value)),
      apCapturado: result.data.objetivo.respiratorio.some(d => /AP:|MV\+/i.test(d.value)),
      hgbCapturada: result.data.objetivo.examesLaboratoriais.some(e => /Hemoglobina/i.test(e.nome)),
      crCapturada: result.data.objetivo.examesLaboratoriais.some(e => /Creatinina/i.test(e.nome)),
      avaliacaoGerada: result.data.avaliacao.sintese.length > 0,
      
      culturaKPC: result.data.objetivo.microbiologia.find(c => /KPC/i.test(c.material)),
      extremidadesComEdema: result.data.objetivo.extremidades.filter(d => /edema/i.test(d.value)),
      
      conflitos: result.conflitos,
      alertas: result.alertas,
      validacao: result.validacaoFinal,
      
      soapFinal: formatSoapFinal(result.data),
    };
    
    setResults(analysis);
    setShowResults(true);
  };

  if (!showResults) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '20px' }}>🔍 Auditoria Real do Motor SOAP</h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
          Este teste executa o motor com dados clínicos reais e mostra exatamente onde estão as falhas.
        </p>
        <button
          onClick={runAudit}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #059669, #0d9488)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
          }}
        >
          ▶️ Executar Auditoria
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#e2e8f0' }}>
      <h1 style={{ marginBottom: '20px' }}>🔍 Resultados da Auditoria Real</h1>
      
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#fbbf24', marginBottom: '15px' }}>1. Dados Extraídos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div><strong>Identificação:</strong> {results.identificacao.nome?.value || '⚠️ VAZIO'}</div>
          <div><strong>Leito:</strong> {results.identificacao.leito?.value || '⚠️ VAZIO'}</div>
          <div><strong>Diagnósticos:</strong> {results.diagnosticos}</div>
          <div><strong>Sinais Vitais:</strong> {results.sinaisVitais} itens</div>
          <div><strong>Cardiovascular:</strong> {results.cardiovascular} itens</div>
          <div><strong>Respiratório:</strong> {results.respiratorio} itens</div>
          <div><strong>Exames Lab:</strong> {results.examesLab} itens</div>
          <div><strong>Microbiologia:</strong> {results.microbiologia} itens</div>
          <div><strong>Avaliação:</strong> {results.avaliacao} itens</div>
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>2. Falhas Detectadas</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '10px', background: results.acCapturado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', borderRadius: '8px' }}>
            {results.acCapturado ? '✅' : '❌'} Ausculta Cardíaca (AC: RCR): {results.acCapturado ? 'CAPTURADO' : 'NÃO CAPTURADO'}
          </div>
          <div style={{ padding: '10px', background: results.apCapturado ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', borderRadius: '8px' }}>
            {results.apCapturado ? '✅' : '❌'} Ausculta Pulmonar (AP: MV+): {results.apCapturado ? 'CAPTURADO' : 'NÃO CAPTURADO'}
          </div>
          <div style={{ padding: '10px', background: results.hgbCapturada ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', borderRadius: '8px' }}>
            {results.hgbCapturada ? '✅' : '❌'} Hemoglobina: {results.hgbCapturada ? 'CAPTURADA' : 'NÃO CAPTURADA'}
          </div>
          <div style={{ padding: '10px', background: results.crCapturada ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', borderRadius: '8px' }}>
            {results.crCapturada ? '✅' : '❌'} Creatinina: {results.crCapturada ? 'CAPTURADA' : 'NÃO CAPTURADA'}
          </div>
          <div style={{ padding: '10px', background: results.avaliacaoGerada ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', borderRadius: '8px' }}>
            {results.avaliacaoGerada ? '✅' : '❌'} Avaliação Clínica: {results.avaliacaoGerada ? 'GERADA' : 'NÃO GERADA'}
          </div>
          <div style={{ padding: '10px', background: 'rgba(245,158,11,0.2)', borderRadius: '8px' }}>
            ⚠️ Cultura KPC classificada como: <strong>{results.culturaKPC?.situacao || 'NÃO ENCONTRADA'}</strong> (deveria ser 'positiva')
          </div>
          <div style={{ padding: '10px', background: 'rgba(245,158,11,0.2)', borderRadius: '8px' }}>
            ⚠️ Extremidades com "edema": <strong>{results.extremidadesComEdema.length} ocorrências</strong> (deveria detectar contradição)
          </div>
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#f59e0b', marginBottom: '15px' }}>3. Conflitos Detectados ({results.conflitos.length})</h2>
        {results.conflitos.length === 0 ? (
          <p style={{ color: '#ef4444' }}>⚠️ NENHUM CONFLITO DETECTADO (deveria haver conflitos de PA, FC, etc.)</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.conflitos.map((c: any, i: number) => (
              <div key={i} style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}>
                <strong>{c.campo}:</strong> "{c.valorAnterior}" vs "{c.valorAtual}"
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#3b82f6', marginBottom: '15px' }}>4. Alertas Gerados ({results.alertas.length})</h2>
        {results.alertas.length === 0 ? (
          <p style={{ color: '#ef4444' }}>⚠️ NENHUM ALERTA GERADO</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.alertas.map((a: any, i: number) => (
              <div key={i} style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px' }}>
                [{a.severidade}] {a.mensagem}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#10b981', marginBottom: '15px' }}>5. Evolução Final Gerada</h2>
        <pre style={{ 
          background: '#0f172a', 
          padding: '15px', 
          borderRadius: '8px', 
          overflow: 'auto',
          fontSize: '12px',
          lineHeight: '1.5',
          maxHeight: '600px',
        }}>
          {results.soapFinal}
        </pre>
      </div>

      <button
        onClick={() => setShowResults(false)}
        style={{
          padding: '12px 24px',
          fontSize: '14px',
          background: '#334155',
          color: '#cbd5e1',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        ← Voltar
      </button>
    </div>
  );
}
