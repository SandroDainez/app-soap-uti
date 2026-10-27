import { useState } from 'react';
import { processEvolution, formatSoapFinal } from './utils/soap-engine';

export default function AuditCompleta() {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const textoBase = `
Paciente: Maria Santos
Leito: 405
Convênio: Bradesco Saúde
Dia de UTI: 7

DX: Infecção do trato urinário complicada (N39.0)
DX: Septicemia por KPC (A41.9)

SV: PA 100/50 mmHg, FC 47-62 bpm, FR 20, Temp 37.8°C, SpO2 94%
AC: RCR 2T, BNF, sem sopros
AP: MV+ bilateral, sem ruídos adventícios
Neurológico: Glasgow 15, RASS 0, pupilas isocóricas reativas
Abdome: plano, flácido, RHA+, indolor
Extremidades: Edema de MMSS 2+/4, perfusão preservada
Diurese: 600ml/24h

Exames Laboratoriais (25/01/2024):
Hemoglobina: 8.5 g/dL
Creatinina: 2.1 mg/dL
PCR: 150 mg/L
Leucócitos: 15.000/mm3

Exames Laboratoriais (28/01/2024):
Hemoglobina: 9.2 g/dL
Creatinina: 1.8 mg/dL
PCR: 95 mg/L
Leucócitos: 12.000/mm3

Hemocultura: KPC positiva (25/01/2024)
Urocultura: E. coli ESBL positiva (25/01/2024)

Meropenem 1g EV 8/8h (início 25/01/2024)
Noradrenalina 0.1 mcg/kg/min
Dieta enteral 40 mL/h

Avaliação: Paciente com sepse de foco urinário, em melhora parcial com antibioticoterapia
Plano: Manter meropenem, otimizar volume, reavaliar em 12h
`;

  const exameAtual = `
PA: 150/70 mmHg
FC: 56 bpm
AC: RCR 2T, BNF, sem sopros
AP: MV+ bilateral, sem RA
Neurológico: Glasgow 15, RASS 0
Extremidades: Sem edema em membros superiores, perfusão preservada
Diurese: 1200ml/24h

Hemoglobina: 10.5 g/dL (30/01/2024)
Creatinina: 1.4 mg/dL (30/01/2024)
PCR: 45 mg/L (30/01/2024)

Dieta enteral 30 mL/h

Plano: Suspender noradrenalina, manter meropenem D6, iniciar dieta oral
`;

  const runAudit = () => {
    const result = processEvolution(textoBase, exameAtual);
    
    // Análise de problemas
    const problemas = {
      diagnosticosSemCID: result.data.avaliacao.diagnosticos.filter(dx => !dx.cid),
      dietas: result.data.objetivo.gastrointestinal.filter(g => /dieta.*ml\/h/i.test(g.value)),
      edamas: result.data.objetivo.extremidades.filter(e => /edama/i.test(e.value)),
      fcs: result.data.objetivo.sinaisVitais.filter(sv => /fc|frequ[êe]ncia card/i.test(sv.value)),
      pas: result.data.objetivo.sinaisVitais.filter(sv => /pa:|ta:/i.test(sv.value)),
      culturasPendentes: result.data.objetivo.microbiologia.filter(c => c.situacao === 'pendente'),
      examesPorData: new Map<string, number>(),
    };

    result.data.objetivo.examesLaboratoriais.forEach(ex => {
      const data = ex.data || 'sem-data';
      problemas.examesPorData.set(data, (problemas.examesPorData.get(data) || 0) + 1);
    });

    setResults({
      data: result.data,
      conflitos: result.conflitos,
      alertas: result.alertas,
      validacao: result.validacaoFinal,
      soapFinal: formatSoapFinal(result.data),
      problemas,
    });
    setShowResults(true);
  };

  if (!showResults) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '20px' }}>🔍 Auditoria Completa - Caso Clínico Sintético</h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
          Execução do fluxo completo com rastreamento de dados em cada etapa.
        </p>
        <button
          onClick={runAudit}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
          }}
        >
          ▶️ Executar Auditoria Completa
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: '#e2e8f0' }}>
      <h1 style={{ marginBottom: '20px' }}>🔍 Resultados da Auditoria Completa</h1>
      
      {/* ETAPA 3: DADOS EXTRAÍDOS */}
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#3b82f6', marginBottom: '15px' }}>ETAPA 3: DADOS EXTRAÍDOS</h2>
        
        <h3 style={{ color: '#94a3b8', fontSize: '14px', marginTop: '15px' }}>3.1 IDENTIFICAÇÃO:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div><strong>Nome:</strong> {results.data.identificacao.nome?.value || '❌ NÃO EXTRAÍDO'}</div>
          <div><strong>Leito:</strong> {results.data.identificacao.leito?.value || '❌ NÃO EXTRAÍDO'}</div>
          <div><strong>Convênio:</strong> {results.data.identificacao.convenio?.value || '❌ NÃO EXTRAÍDO'}</div>
          <div><strong>Dia UTI:</strong> {results.data.identificacao.diaUTI?.value || '❌ NÃO EXTRAÍDO'}</div>
        </div>

        <h3 style={{ color: '#94a3b8', fontSize: '14px', marginTop: '15px' }}>3.2 DIAGNÓSTICOS:</h3>
        {results.data.avaliacao.diagnosticos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {results.data.avaliacao.diagnosticos.map((dx: any, i: number) => (
              <div key={i} style={{ padding: '8px', background: dx.cid ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', borderRadius: '6px' }}>
                {i + 1}. {dx.texto} {dx.cid ? `(${dx.cid}) ✅` : '❌ SEM CID'}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#ef4444' }}>❌ NENHUM DIAGNÓSTICO EXTRAÍDO</p>
        )}

        <h3 style={{ color: '#94a3b8', fontSize: '14px', marginTop: '15px' }}>3.3 SINAIS VITAIS ({results.data.objetivo.sinaisVitais.length} itens):</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {results.data.objetivo.sinaisVitais.map((sv: any, i: number) => (
            <div key={i} style={{ padding: '6px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', fontSize: '13px' }}>
              {i + 1}. {sv.value} <span style={{ color: '#64748b' }}>[{sv.source}]</span>
            </div>
          ))}
        </div>

        <h3 style={{ color: '#94a3b8', fontSize: '14px', marginTop: '15px' }}>3.4 EXAMES LABORATORIAIS ({results.data.objetivo.examesLaboratoriais.length} itens):</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {results.data.objetivo.examesLaboratoriais.map((ex: any, i: number) => (
            <div key={i} style={{ padding: '6px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px', fontSize: '13px' }}>
              {i + 1}. {ex.nome} | Data: {ex.data || '❌ SEM DATA'} | Valor: {ex.valor} <span style={{ color: '#64748b' }}>[{ex.source}]</span>
            </div>
          ))}
        </div>

        <h3 style={{ color: '#94a3b8', fontSize: '14px', marginTop: '15px' }}>3.5 MICROBIOLOGIA ({results.data.objetivo.microbiologia.length} itens):</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {results.data.objetivo.microbiologia.map((micro: any, i: number) => (
            <div key={i} style={{ padding: '6px', background: micro.situacao === 'positiva' ? 'rgba(5,150,105,0.2)' : 'rgba(245,158,11,0.2)', borderRadius: '6px', fontSize: '13px' }}>
              {i + 1}. {micro.material} | Situação: {micro.situacao} | Data: {micro.dataColeta || '❌ SEM DATA'} <span style={{ color: '#64748b' }}>[{micro.source}]</span>
            </div>
          ))}
        </div>
      </div>

      {/* ETAPA 4: CONFLITOS */}
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#f59e0b', marginBottom: '15px' }}>ETAPA 4: CONFLITOS DETECTADOS ({results.conflitos.length})</h2>
        {results.conflitos.length === 0 ? (
          <p style={{ color: '#ef4444' }}>❌ NENHUM CONFLITO DETECTADO (DEVERIA DETECTAR!)</p>
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

      {/* ETAPA 8: ANÁLISE DE PROBLEMAS */}
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>ETAPA 8: ANÁLISE DE PROBLEMAS DETECTADOS</h2>
        
        <h3 style={{ color: '#fca5a5', marginTop: '15px' }}>❌ PROBLEMA 1: DIAGNÓSTICOS SEM CID</h3>
        {results.problemas.diagnosticosSemCID.length > 0 ? (
          <div>
            <p style={{ color: '#ef4444' }}>{results.problemas.diagnosticosSemCID.length} diagnóstico(s) sem CID:</p>
            {results.problemas.diagnosticosSemCID.map((dx: any, i: number) => (
              <div key={i} style={{ padding: '6px', background: 'rgba(220,38,38,0.2)', borderRadius: '6px', marginLeft: '20px', marginBottom: '5px' }}>
                - {dx.texto}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#10b981' }}>✅ Todos os diagnósticos têm CID</p>
        )}

        <h3 style={{ color: '#fca5a5', marginTop: '15px' }}>❌ PROBLEMA 2: CONTRADIÇÕES NÃO DETECTADAS</h3>
        <div style={{ marginLeft: '20px' }}>
          {results.problemas.dietas.length > 1 && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ color: '#ef4444' }}>❌ Dieta: {results.problemas.dietas.length} valores diferentes (40 mL/h e 30 mL/h)</p>
              {results.problemas.dietas.map((d: any, i: number) => (
                <div key={i} style={{ padding: '4px', background: 'rgba(220,38,38,0.1)', borderRadius: '4px', fontSize: '13px' }}>
                  - {d.value}
                </div>
              ))}
            </div>
          )}
          {results.problemas.edamas.length > 1 && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ color: '#ef4444' }}>❌ Edema: {results.problemas.edamas.length} valores contraditórios</p>
              {results.problemas.edamas.map((e: any, i: number) => (
                <div key={i} style={{ padding: '4px', background: 'rgba(220,38,38,0.1)', borderRadius: '4px', fontSize: '13px' }}>
                  - {e.value}
                </div>
              ))}
            </div>
          )}
          {results.problemas.fcs.length > 1 && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ color: '#ef4444' }}>❌ FC: {results.problemas.fcs.length} valores diferentes (47-62 bpm e 56 bpm)</p>
              {results.problemas.fcs.map((fc: any, i: number) => (
                <div key={i} style={{ padding: '4px', background: 'rgba(220,38,38,0.1)', borderRadius: '4px', fontSize: '13px' }}>
                  - {fc.value}
                </div>
              ))}
            </div>
          )}
          {results.problemas.pas.length > 1 && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ color: '#ef4444' }}>❌ PA: {results.problemas.pas.length} valores diferentes (100/50 e 150/70)</p>
              {results.problemas.pas.map((pa: any, i: number) => (
                <div key={i} style={{ padding: '4px', background: 'rgba(220,38,38,0.1)', borderRadius: '4px', fontSize: '13px' }}>
                  - {pa.value}
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 style={{ color: '#fca5a5', marginTop: '15px' }}>❌ PROBLEMA 3: EXAMES LABORATORIAIS DE DATAS DIFERENTES</h3>
        <div style={{ marginLeft: '20px' }}>
          <p>Exames por data:</p>
          {Array.from(results.problemas.examesPorData.entries()).map((entry, i) => {
            const [data, count] = entry as [string, number];
            return (
              <div key={i} style={{ padding: '4px', fontSize: '13px' }}>
                {data}: {count} exame(s)
              </div>
            );
          })}
        </div>

        <h3 style={{ color: '#fca5a5', marginTop: '15px' }}>❌ PROBLEMA 4: CULTURAS CLASSIFICADAS INCORRETAMENTE</h3>
        {results.problemas.culturasPendentes.length > 0 ? (
          <div style={{ marginLeft: '20px' }}>
            <p style={{ color: '#ef4444' }}>❌ {results.problemas.culturasPendentes.length} cultura(s) classificada(s) como "pendente":</p>
            {results.problemas.culturasPendentes.map((c: any, i: number) => (
              <div key={i} style={{ padding: '4px', background: 'rgba(220,38,38,0.1)', borderRadius: '4px', fontSize: '13px' }}>
                - {c.material}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#10b981' }}>✅ Nenhuma cultura classificada como pendente</p>
        )}
      </div>

      {/* ETAPA 7: EVOLUÇÃO FINAL */}
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#10b981', marginBottom: '15px' }}>ETAPA 7: EVOLUÇÃO FINAL GERADA</h2>
        <pre style={{ 
          background: '#0f172a', 
          padding: '15px', 
          borderRadius: '8px', 
          overflow: 'auto',
          fontSize: '12px',
          lineHeight: '1.5',
          maxHeight: '800px',
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
