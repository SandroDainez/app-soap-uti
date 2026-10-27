import { useState } from 'react';
import { processEvolution } from './utils/soap-engine';

export default function TestDiagnosticos() {
  const [result, setResult] = useState<any>(null);

  const textoBase = `
Paciente: Maria Santos
Leito: 405
Convênio: Bradesco Saúde

DX: Infecção do trato urinário complicada (N39.0)
DX: Septicemia por KPC (A41.9)

SV: PA 100/50 mmHg
`;

  const exameAtual = `
PA: 150/70 mmHg
`;

  const runTest = () => {
    const res = processEvolution(textoBase, exameAtual);
    setResult(res);
  };

  if (!result) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '20px' }}>🧪 Teste de Extração de Diagnósticos</h1>
        <button
          onClick={runTest}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          ▶️ Executar Teste
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: '#e2e8f0' }}>
      <h1 style={{ marginBottom: '20px' }}>🧪 Resultados do Teste de Diagnósticos</h1>
      
      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#3b82f6', marginBottom: '15px' }}>Diagnósticos Extraídos</h2>
        <p><strong>Total:</strong> {result.data.avaliacao.diagnosticos.length}</p>
        {result.data.avaliacao.diagnosticos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {result.data.avaliacao.diagnosticos.map((dx: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: dx.cid ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)', borderRadius: '8px' }}>
                <strong>{i + 1}.</strong> {dx.texto} {dx.cid ? <span style={{ color: '#10b981' }}>({dx.cid}) ✅</span> : <span style={{ color: '#ef4444' }}>❌ SEM CID</span>}
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                  Status: {dx.status} | Fonte: {dx.source}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#ef4444', marginTop: '15px' }}>❌ NENHUM DIAGNÓSTICO EXTRAÍDO</p>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ color: '#10b981', marginBottom: '15px' }}>Síntese Gerada</h2>
        {result.data.avaliacao.sintese.length > 0 ? (
          <div style={{ padding: '12px', background: 'rgba(5,150,105,0.1)', borderRadius: '8px' }}>
            {result.data.avaliacao.sintese[0].value}
          </div>
        ) : (
          <p style={{ color: '#ef4444' }}>❌ SÍNTESE VAZIA</p>
        )}
      </div>

      <button
        onClick={() => setResult(null)}
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
