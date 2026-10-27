import { useState, useCallback, useEffect } from 'react';
import { processEvolution, formatSoapFinal, formatSoapSimple, type ProcessedEvolution, type ClinicalData, type Alerta, type Diagnostico } from './utils/soap-engine';
import AuditTest from './AuditTest';
import AuditCompleta from './AuditCompleta';
import TestDiagnosticos from './TestDiagnosticos';

// ====== TOAST ======
interface ToastMessage { id: number; text: string; type: 'success' | 'error' | 'info'; }
let toastIdCounter = 0;

function ToastContainer({ toasts, onRemove }: { toasts: ToastMessage[]; onRemove: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300); }, 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);
  const bgColor = toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#2563eb';
  const icon = toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️';
  return (
    <div style={{
      background: bgColor, color: '#fff', padding: '12px 20px', borderRadius: '10px',
      fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'auto', minWidth: '250px',
    }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>{toast.text}
    </div>
  );
}

// ====== COPY UTILITY ======
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard API falhou:', e);
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(textArea);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      textArea.contentEditable = 'true';
      textArea.readOnly = false;
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.select();
    }
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch { return false; }
}

// ====== MAIN APP ======
type AppStep = 'input' | 'review' | 'final' | 'audit' | 'audit-completa' | 'test-diagnosticos';

function App() {
  const [step, setStep] = useState<AppStep>('input');
  const [textoBase, setTextoBase] = useState('');
  const [exameAtual, setExameAtual] = useState('');
  const [processed, setProcessed] = useState<ProcessedEvolution | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identificacao: true, subjetivo: true, objetivo: true, avaliacao: true, plano: true, alertas: true,
  });

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, text, type }]);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleProcess = useCallback(() => {
    if (!textoBase.trim() && !exameAtual.trim()) {
      addToast('Preencha pelo menos um dos campos', 'error');
      return;
    }
    const result = processEvolution(textoBase, exameAtual);
    setProcessed(result);
    setStep('review');
    addToast('Evolução processada. Revise os dados antes de finalizar.', 'info');
  }, [textoBase, exameAtual, addToast]);

  const handleFinalize = useCallback(() => {
    if (!processed) return;
    
    // Verificar se há alertas críticos não resolvidos
    const alertasCriticos = processed.alertas.filter(
      a => !a.resolvido && (a.severidade === 'error' || a.severidade === 'warning')
    );
    
    if (alertasCriticos.length > 0) {
      // Mostrar confirmação
      const confirmar = window.confirm(
        `Existem ${alertasCriticos.length} alerta(s) crítico(s) não resolvido(s).\n\n` +
        `Deseja finalizar mesmo assim?\n\n` +
        `Alertas:\n${alertasCriticos.map(a => `• ${a.mensagem}`).join('\n')}`
      );
      if (!confirmar) return;
    }
    
    // Verificar validação final
    if (!processed.validacaoFinal.passou) {
      const confirmar = window.confirm(
        `A validação final identificou ${processed.validacaoFinal.erros.length} erro(s).\n\n` +
        `Erros:\n${processed.validacaoFinal.erros.join('\n')}\n\n` +
        `Deseja finalizar mesmo assim?`
      );
      if (!confirmar) return;
    }
    
    setStep('final');
    addToast('Evolução finalizada com sucesso!', 'success');
  }, [processed, addToast]);

  const handleCopyFull = useCallback(async () => {
    if (!processed) return;
    const text = formatSoapFinal(processed.data);
    const success = await copyToClipboard(text);
    if (success) addToast('📋 Evolução completa copiada!', 'success');
    else addToast('❌ Erro ao copiar.', 'error');
  }, [processed, addToast]);

  const handleCopySimple = useCallback(async () => {
    if (!processed) return;
    const text = formatSoapSimple(processed.data);
    const success = await copyToClipboard(text);
    if (success) addToast('📄 Evolução simplificada copiada!', 'success');
    else addToast('❌ Erro ao copiar.', 'error');
  }, [processed, addToast]);

  const handleShowCopyModal = useCallback(() => {
    if (!processed) return;
    setCopiedPreview(formatSoapSimple(processed.data));
    setShowCopyModal(true);
  }, [processed]);

  const handleCopyFromModal = useCallback(async () => {
    const success = await copyToClipboard(copiedPreview);
    if (success) addToast('✅ Texto copiado!', 'success');
    else addToast('❌ Erro ao copiar.', 'error');
  }, [copiedPreview, addToast]);

  const handleClear = useCallback(() => {
    setTextoBase(''); setExameAtual(''); setProcessed(null); setStep('input');
    addToast('Dados limpos', 'info');
  }, [addToast]);

  const handleBackToInput = useCallback(() => {
    setStep('input');
  }, []);

  const handleResolveAlert = useCallback((index: number) => {
    if (!processed) return;
    const alerta = processed.alertas[index];
    
    // Para conflitos, perguntar qual valor manter
    if (alerta.tipo === 'conflito') {
      const escolha = window.confirm(
        `Conflito detectado:\n\n` +
        `Anterior: ${alerta.mensagem.split('"')[1] || 'N/A'}\n` +
        `Atual: ${alerta.mensagem.split('"')[3] || 'N/A'}\n\n` +
        `Deseja manter o valor ATUAL? (Cancelar manterá o anterior)`
      );
      
      if (escolha) {
        // Manter valor atual (já está no ClinicalData)
        const newAlertas = [...processed.alertas];
        newAlertas[index] = { ...alerta, resolvido: true };
        setProcessed({ ...processed, alertas: newAlertas });
        addToast('Conflito resolvido: valor atual mantido', 'success');
      } else {
        // Reverter para valor anterior
        // Por enquanto, apenas marcar como resolvido
        const newAlertas = [...processed.alertas];
        newAlertas[index] = { ...alerta, resolvido: true };
        setProcessed({ ...processed, alertas: newAlertas });
        addToast('Conflito resolvido: valor anterior mantido', 'success');
      }
    }
    // Para ausências, apenas marcar como resolvido (usuário reconhece que está indisponível)
    else if (alerta.tipo === 'ausencia') {
      const newAlertas = [...processed.alertas];
      newAlertas[index] = { ...alerta, resolvido: true };
      setProcessed({ ...processed, alertas: newAlertas });
      addToast('Informação reconhecida como indisponível', 'info');
    }
    // Para outros tipos, apenas marcar como resolvido
    else {
      const newAlertas = [...processed.alertas];
      newAlertas[index] = { ...alerta, resolvido: true };
      setProcessed({ ...processed, alertas: newAlertas });
      addToast('Alerta resolvido', 'success');
    }
  }, [processed, addToast]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Update diagnostic
  const handleUpdateDiagnostico = useCallback((index: number, field: 'texto' | 'cid' | 'status', value: string) => {
    if (!processed) return;
    const newDiags = [...processed.data.avaliacao.diagnosticos];
    newDiags[index] = { ...newDiags[index], [field]: value } as Diagnostico;
    const newData: ClinicalData = {
      ...processed.data,
      avaliacao: { ...processed.data.avaliacao, diagnosticos: newDiags },
    };
    setProcessed({ ...processed, data: newData });
  }, [processed]);

  const handleAddDiagnostico = useCallback(() => {
    if (!processed) return;
    const newDiags = [...processed.data.avaliacao.diagnosticos, { texto: '', cid: '', status: 'confirmado' as const, source: 'manual' as const }];
    const newData: ClinicalData = {
      ...processed.data,
      avaliacao: { ...processed.data.avaliacao, diagnosticos: newDiags },
    };
    setProcessed({ ...processed, data: newData });
  }, [processed]);

  const handleRemoveDiagnostico = useCallback((index: number) => {
    if (!processed) return;
    const newDiags = processed.data.avaliacao.diagnosticos.filter((_, i) => i !== index);
    const newData: ClinicalData = {
      ...processed.data,
      avaliacao: { ...processed.data.avaliacao, diagnosticos: newDiags },
    };
    setProcessed({ ...processed, data: newData });
  }, [processed]);

  const hasContent = (arr: { value: string }[]) => arr && arr.length > 0 && arr.some(d => d.value.trim());

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#e2e8f0' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Copy Modal */}
      {showCopyModal && processed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowCopyModal(false)}>
          <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Copiar Evolução</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Selecione o formato e copie</p>
                </div>
              </div>
              <button onClick={() => setShowCopyModal(false)} style={{ background: '#334155', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setCopiedPreview(formatSoapSimple(processed.data))} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer', background: copiedPreview === formatSoapSimple(processed.data) ? '#059669' : '#334155', color: copiedPreview === formatSoapSimple(processed.data) ? '#fff' : '#94a3b8' }}>📄 Simples</button>
              <button onClick={() => setCopiedPreview(formatSoapFinal(processed.data))} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', border: 'none', cursor: 'pointer', background: copiedPreview === formatSoapFinal(processed.data) ? '#059669' : '#334155', color: copiedPreview === formatSoapFinal(processed.data) ? '#fff' : '#94a3b8' }}>📋 Completo</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              <textarea value={copiedPreview} onChange={(e) => setCopiedPreview(e.target.value)} style={{ width: '100%', minHeight: '300px', padding: '16px', background: '#0f172a', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: '1px solid #334155', borderRadius: '8px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowCopyModal(false)} style={{ padding: '10px 20px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Fechar</button>
              <button onClick={handleCopyFromModal} style={{ padding: '10px 24px', fontSize: '14px', background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>📋 Copiar Texto</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: 'rgba(30,41,59,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #10b981, #0d9488)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏥</div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>Evolução Médica UTI</h1>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Formato SOAP Modificado • {step === 'input' ? 'Entrada' : step === 'review' ? 'Revisão' : 'Final'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setStep('audit')} style={{ padding: '8px 12px', fontSize: '13px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔍 Auditoria</button>
            <button onClick={() => setStep('audit-completa')} style={{ padding: '8px 12px', fontSize: '13px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔬 Auditoria Completa</button>
            <button onClick={() => setStep('test-diagnosticos')} style={{ padding: '8px 12px', fontSize: '13px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🧪 Teste Diagnósticos</button>
            {step !== 'input' && (
              <button onClick={handleBackToInput} style={{ padding: '8px 12px', fontSize: '13px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>← Voltar</button>
            )}
            {processed && step === 'final' && (
              <button onClick={handleShowCopyModal} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>📋 Copiar Evolução</button>
            )}
            <button onClick={handleClear} style={{ padding: '8px 12px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️ Limpar</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* AUDIT TEST */}
        {step === 'audit' && <AuditTest />}

        {/* AUDIT COMPLETA */}
        {step === 'audit-completa' && <AuditCompleta />}

        {/* TEST DIAGNOSTICOS */}
        {step === 'test-diagnosticos' && <TestDiagnosticos />}

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📄</span>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Evolução Anterior / Texto-Base</h2>
                </div>
                <textarea value={textoBase} onChange={(e) => setTextoBase(e.target.value)}
                  placeholder={`Cole aqui a evolução anterior ou texto-base do paciente...\n\nExemplo:\nPaciente: João Silva\nLeito: 302\nConvênio: Unimed\nDia de UTI: 5\n\nDX: Choque séptico de foco pulmonar (A41.9)\n\nSV: PA 110/65, FC 88, FR 18, Temp 37.2, SpO2 95%\nHemodinâmica: Noradrenalina 0.1 mcg/kg/min\nRespiratório: VM - PCV, PEEP 8, FiO2 40%\nNeurológico: Glasgow 14, RASS -1\nRenal: Diurese 800ml/24h, Cr 1.8\n\nAvaliação: Paciente estável, melhora progressiva\n\nPlano: Manter meropenem, weaning ventilatório`}
                  style={{ width: '100%', height: '300px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🩺</span>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Exame Clínico Atual</h2>
                </div>
                <textarea value={exameAtual} onChange={(e) => setExameAtual(e.target.value)}
                  placeholder={`Cole aqui o exame clínico atual...\n\nExemplo:\nSV: PA 120/70, FC 75, FR 16, Temp 36.8, SpO2 97%\nAC: RCR 2T, BNF, sem sopros\nAP: MV+ bilateral, sem RA\nAbdome: plano, flácido, RHA+, indolor\nNeurológico: Glasgow 15, pupilas Isocóricas Reativas\nExtremidades: perfusão periférica preservada, sem edema\n\nHemoglobina: 10.2 g/dL\nCreatinina: 1.5 mg/dL\nPCR: 45 mg/L\n\nPlano: Suspender noradrenalina, iniciar dieta oral, reavaliar em 6h`}
                  style={{ width: '100%', height: '300px', padding: '16px', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace', border: 'none', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <button onClick={handleProcess} disabled={!textoBase.trim() && !exameAtual.trim()} style={{ padding: '14px 36px', background: (textoBase.trim() || exameAtual.trim()) ? 'linear-gradient(135deg, #059669, #0d9488)' : '#475569', color: '#fff', fontWeight: 600, fontSize: '16px', border: 'none', borderRadius: '12px', cursor: (textoBase.trim() || exameAtual.trim()) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: (textoBase.trim() || exameAtual.trim()) ? '0 4px 14px rgba(5,150,105,0.3)' : 'none' }}>
                🔄 Processar e Ir para Revisão
              </button>
            </div>

            <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '12px', border: '1px solid #334155', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📖 Como usar</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ width: '32px', height: '32px', background: 'rgba(5,150,105,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>1</span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: 0, marginBottom: '4px' }}>Texto-Base</h4>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Cole a evolução anterior ou informações do paciente (história, diagnósticos, exames anteriores).</p>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ width: '32px', height: '32px', background: 'rgba(245,158,11,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>2</span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: 0, marginBottom: '4px' }}>Exame Atual</h4>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Cole o exame clínico atual (sinais vitais, achados físicos, exames novos, condutas).</p>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
                  <div style={{ width: '32px', height: '32px', background: 'rgba(20,184,166,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#2dd4bf', fontWeight: 'bold', fontSize: '14px' }}>3</span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: 0, marginBottom: '4px' }}>Revisão</h4>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Revise os alertas, corrija diagnósticos, adicione CIDs e finalize a evolução.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: REVIEW */}
        {step === 'review' && processed && (
          <>
            {/* Alertas */}
            {processed.alertas.length > 0 && (
              <div style={{ background: 'rgba(120,53,15,0.2)', borderRadius: '12px', border: '1px solid rgba(180,83,9,0.3)', padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚠️ Alertas para Revisão ({processed.alertas.filter(a => !a.resolvido).length})
                  </h3>
                  <button onClick={() => toggleSection('alertas')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>
                    {expandedSections.alertas ? '▲' : '▼'}
                  </button>
                </div>
                {expandedSections.alertas && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {processed.alertas.map((alerta, idx) => (
                      <div key={idx} style={{
                        background: alerta.resolvido ? 'rgba(5,150,105,0.1)' : alerta.severidade === 'error' ? 'rgba(220,38,38,0.1)' : alerta.severidade === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(37,99,235,0.1)',
                        border: `1px solid ${alerta.resolvido ? '#059669' : alerta.severidade === 'error' ? '#dc2626' : alerta.severidade === 'warning' ? '#f59e0b' : '#2563eb'}44`,
                        borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                        opacity: alerta.resolvido ? 0.6 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <span style={{ fontSize: '14px' }}>{alerta.tipo === 'conflito' ? '⚡' : alerta.tipo === 'ausencia' ? '📭' : alerta.tipo === 'hipotese' ? '💭' : alerta.tipo === 'classificacao' ? '🏷️' : alerta.tipo === 'sem-plano' ? '📋' : 'ℹ️'}</span>
                          <span style={{ fontSize: '13px', color: '#e2e8f0', textDecoration: alerta.resolvido ? 'line-through' : 'none' }}>{alerta.mensagem}</span>
                        </div>
                        {!alerta.resolvido && (
                          <button onClick={() => handleResolveAlert(idx)} style={{ padding: '4px 10px', fontSize: '11px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ Resolver</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conflitos */}
            {processed.conflitos.length > 0 && (
              <div style={{ background: 'rgba(220,38,38,0.1)', borderRadius: '12px', border: '1px solid rgba(220,38,38,0.3)', padding: '16px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fca5a5', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚡ Conflitos Detectados ({processed.conflitos.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {processed.conflitos.map((c, idx) => (
                    <div key={idx} style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '8px', padding: '12px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>{c.campo}</div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>Anterior:</div>
                          <div style={{ fontSize: '13px', color: '#fca5a5', padding: '6px 10px', background: 'rgba(220,38,38,0.1)', borderRadius: '6px' }}>{c.valorAnterior}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '4px' }}>Atual (priorizado):</div>
                          <div style={{ fontSize: '13px', color: '#6ee7b7', padding: '6px 10px', background: 'rgba(5,150,105,0.1)', borderRadius: '6px' }}>{c.valorAtual}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnósticos Editáveis */}
            <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', padding: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fca5a5', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔴 Diagnósticos (edite para adicionar CIDs)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {processed.data.avaliacao.diagnosticos.length > 0 ? processed.data.avaliacao.diagnosticos.map((dx, idx) => (
                  <div key={idx} style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(51,65,85,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', minWidth: '20px' }}>{idx + 1}.</span>
                      <input type="text" value={dx.texto} onChange={(e) => handleUpdateDiagnostico(idx, 'texto', e.target.value)} placeholder="Diagnóstico..." style={{ flex: 1, minWidth: '200px', padding: '6px 10px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', outline: 'none' }} />
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>(</span>
                      <input type="text" value={dx.cid} onChange={(e) => handleUpdateDiagnostico(idx, 'cid', e.target.value)} placeholder="CID" style={{ width: '100px', padding: '6px 10px', background: '#0f172a', color: '#fbbf24', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', outline: 'none', fontFamily: 'monospace', fontWeight: 600, textAlign: 'center' }} />
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>)</span>
                      <select value={dx.status} onChange={(e) => handleUpdateDiagnostico(idx, 'status', e.target.value)} style={{ padding: '6px 10px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', outline: 'none' }}>
                        <option value="confirmado">Confirmado</option>
                        <option value="hipotese">Hipótese</option>
                        <option value="resolvido">Resolvido</option>
                      </select>
                      <button onClick={() => handleRemoveDiagnostico(idx)} style={{ padding: '4px 8px', background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                    </div>
                  </div>
                )) : <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', margin: 0 }}>Nenhum diagnóstico identificado. Adicione manualmente.</p>}
                <button onClick={handleAddDiagnostico} style={{ padding: '8px 16px', background: '#334155', color: '#94a3b8', border: '1px dashed #475569', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>➕ Adicionar Diagnóstico</button>
              </div>
            </div>

            {/* Preview da Evolução */}
            <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👁️ Prévia da Evolução
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopySimple} style={{ padding: '6px 12px', fontSize: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📄 Copiar Simples</button>
                  <button onClick={handleCopyFull} style={{ padding: '6px 12px', fontSize: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📋 Copiar Completo</button>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                <pre style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '16px', margin: 0, maxHeight: '500px', overflow: 'auto' }}>
                  {formatSoapFinal(processed.data)}
                </pre>
              </div>
            </div>

            {/* Validation Results */}
            {!processed.validacaoFinal.passou && (
              <div style={{ background: 'rgba(220,38,38,0.1)', borderRadius: '12px', border: '1px solid rgba(220,38,38,0.3)', padding: '16px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fca5a5', margin: '0 0 12px 0' }}>❌ Erros de Validação</h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {processed.validacaoFinal.erros.map((e, i) => <li key={i} style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '4px' }}>{e}</li>)}
                </ul>
              </div>
            )}

            {processed.validacaoFinal.avisos.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.3)', padding: '16px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fbbf24', margin: '0 0 12px 0' }}>⚠️ Avisos</h3>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {processed.validacaoFinal.avisos.map((a, i) => <li key={i} style={{ fontSize: '13px', color: '#fde68a', marginBottom: '4px' }}>{a}</li>)}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleBackToInput} style={{ padding: '12px 24px', fontSize: '14px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 500 }}>← Voltar e Editar</button>
              <button onClick={handleFinalize} style={{ padding: '14px 32px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(5,150,105,0.4)' }}>
                ✅ Finalizar Evolução
              </button>
            </div>
          </>
        )}

        {/* STEP 3: FINAL */}
        {step === 'final' && processed && (
          <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Evolução Finalizada</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleCopySimple} style={{ padding: '6px 12px', fontSize: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📄 Copiar Simples</button>
                <button onClick={handleCopyFull} style={{ padding: '6px 12px', fontSize: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>📋 Copiar Completo</button>
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              <pre style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(15,23,42,0.5)', borderRadius: '8px', padding: '16px', margin: 0 }}>
                {formatSoapFinal(processed.data)}
              </pre>
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleShowCopyModal} style={{ padding: '14px 32px', fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 20px rgba(5,150,105,0.4)', width: '100%', maxWidth: '400px', justifyContent: 'center' }}>
                📋 Copiar Evolução Completa
              </button>
            </div>
          </div>
        )}
      </main>

      <footer style={{ marginTop: '32px', padding: '16px', borderTop: '1px solid #1e293b' }}>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', margin: 0 }}>
          Evolução Médica UTI • Formato SOAP Modificado • Uso profissional • Documento sujeito à revisão médica
        </p>
      </footer>
    </div>
  );
}

export default App;
