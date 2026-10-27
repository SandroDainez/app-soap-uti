import { useState } from 'react';
import { processEvolution, formatSoapFinal } from './utils/soap-engine';

interface TestCase {
  name: string;
  textoBase: string;
  exameAtual: string;
  expectedResults: {
    sinaisVitaisAtual?: boolean;
    examesComData?: boolean;
    semDuplicacaoCreatinina?: boolean;
    semDuplicacaoDiurese?: boolean;
    culturaPositiva?: boolean;
    diagnosticosPresentes?: boolean;
  };
}

const testCases: TestCase[] = [
  {
    name: 'Teste 1: Sinais Vitais Atualizados',
    textoBase: `Paciente: João Silva
Leito: 302
SV: PA 100/50 mmHg, FC 80 bpm`,
    exameAtual: `PA: 150/70 mmHg
FC: 75 bpm`,
    expectedResults: {
      sinaisVitaisAtual: true,
    },
  },
  {
    name: 'Teste 2: Exames com Datas',
    textoBase: `Exames Laboratoriais (25/01/2024):
Hemoglobina: 8.5 g/dL
Creatinina: 2.1 mg/dL

Exames Laboratoriais (28/01/2024):
Hemoglobina: 9.2 g/dL
Creatinina: 1.8 mg/dL`,
    exameAtual: `Hemoglobina: 10.5 g/dL (30/01/2024)
Creatinina: 1.4 mg/dL (30/01/2024)`,
    expectedResults: {
      examesComData: true,
    },
  },
  {
    name: 'Teste 3: Sem Duplicação de Creatinina',
    textoBase: `Creatinina: 2.1 mg/dL
Creatinina: 1.8 mg/dL`,
    exameAtual: `Creatinina: 1.4 mg/dL (30/01/2024)`,
    expectedResults: {
      semDuplicacaoCreatinina: true,
    },
  },
  {
    name: 'Teste 4: Cultura Positiva Classificada',
    textoBase: `Hemocultura: KPC positiva (25/01/2024)`,
    exameAtual: ``,
    expectedResults: {
      culturaPositiva: true,
    },
  },
  {
    name: 'Teste 5: Diagnósticos Presentes',
    textoBase: `DX: Infecção do trato urinário (N39.0)
DX: Septicemia (A41.9)`,
    exameAtual: ``,
    expectedResults: {
      diagnosticosPresentes: true,
    },
  },
];

export default function TestRunner() {
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = () => {
    setRunning(true);
    const testResults: any[] = [];

    for (const test of testCases) {
      try {
        const result = processEvolution(test.textoBase, test.exameAtual);
        const soapFinal = formatSoapFinal(result.data);

        const testResult: any = {
          name: test.name,
          passed: true,
          details: [],
        };

        // Verificar resultados esperados
        if (test.expectedResults.sinaisVitaisAtual) {
          const hasAtualSV = /PA: 150\/70|FC: 75/i.test(soapFinal);
          const hasBaseSV = /PA: 100\/50|FC: 80/i.test(soapFinal);
          if (hasAtualSV && !hasBaseSV) {
            testResult.details.push({ check: 'Sinais vitais atualizados', passed: true });
          } else {
            testResult.details.push({ check: 'Sinais vitais atualizados', passed: false });
            testResult.passed = false;
          }
        }

        if (test.expectedResults.examesComData) {
          const examesComData = result.data.objetivo.examesLaboratoriais.filter(e => e.data);
          if (examesComData.length > 0) {
            testResult.details.push({ check: `${examesComData.length} exames com data`, passed: true });
          } else {
            testResult.details.push({ check: 'Exames com data', passed: false });
            testResult.passed = false;
          }
        }

        if (test.expectedResults.semDuplicacaoCreatinina) {
          const creatininas = result.data.objetivo.examesLaboratoriais.filter(e => /creatinina/i.test(e.nome));
          if (creatininas.length === 1) {
            testResult.details.push({ check: 'Sem duplicação de creatinina', passed: true });
          } else {
            testResult.details.push({ check: `${creatininas.length} creatininas (deveria ser 1)`, passed: false });
            testResult.passed = false;
          }
        }

        if (test.expectedResults.culturaPositiva) {
          const cultura = result.data.objetivo.microbiologia.find(c => /kpc/i.test(c.material));
          if (cultura && cultura.situacao === 'positiva') {
            testResult.details.push({ check: 'Cultura KPC classificada como positiva', passed: true });
          } else {
            testResult.details.push({ check: 'Cultura KPC classificada corretamente', passed: false });
            testResult.passed = false;
          }
        }

        if (test.expectedResults.diagnosticosPresentes) {
          if (result.data.avaliacao.diagnosticos.length > 0) {
            testResult.details.push({ check: `${result.data.avaliacao.diagnosticos.length} diagnósticos presentes`, passed: true });
          } else {
            testResult.details.push({ check: 'Diagnósticos presentes', passed: false });
            testResult.passed = false;
          }
        }

        testResults.push(testResult);
      } catch (error) {
        testResults.push({
          name: test.name,
          passed: false,
          details: [{ check: `Erro: ${error}`, passed: false }],
        });
      }
    }

    setResults(testResults);
    setRunning(false);
  };

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#e2e8f0' }}>
      <h1 style={{ marginBottom: '20px' }}>🧪 Testes Automatizados — SOAP Engine</h1>

      <button
        onClick={runTests}
        disabled={running}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 600,
          background: running ? '#475569' : 'linear-gradient(135deg, #059669, #0d9488)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: running ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {running ? '⏳ Executando...' : '▶️ Executar Testes'}
      </button>

      {results.length > 0 && (
        <>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <h2 style={{ margin: '0 0 15px 0', color: '#fff' }}>
              Resultado Final: {passedCount} aprovados, {failedCount} reprovados
            </h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{
                padding: '10px 20px',
                background: 'rgba(5,150,105,0.2)',
                borderRadius: '8px',
                color: '#10b981',
                fontWeight: 600,
              }}>
                ✅ {passedCount} Aprovados
              </div>
              <div style={{
                padding: '10px 20px',
                background: 'rgba(220,38,38,0.2)',
                borderRadius: '8px',
                color: '#ef4444',
                fontWeight: 600,
              }}>
                ❌ {failedCount} Reprovados
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {results.map((result, idx) => (
              <div
                key={idx}
                style={{
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '20px',
                  border: `2px solid ${result.passed ? '#10b981' : '#ef4444'}`,
                }}
              >
                <h3 style={{ margin: '0 0 15px 0', color: result.passed ? '#10b981' : '#ef4444' }}>
                  {result.passed ? '✅' : '❌'} {result.name}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.details.map((detail: any, detailIdx: number) => (
                    <div
                      key={detailIdx}
                      style={{
                        padding: '8px 12px',
                        background: detail.passed ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.1)',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    >
                      {detail.passed ? '✓' : '✗'} {detail.check}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
