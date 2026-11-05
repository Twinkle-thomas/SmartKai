import EvaluatorStorage from './EvaluatorStorage.jsx';
import PasswordRecovery from './PasswordRecovery.jsx';

export default function AuthPage({ client, mode }) {
  const registering = mode === 'register';
  return <div className="auth-page-layout">
    <section className="auth-introduction"><p className="eyebrow">A little care for food at home</p><h1>{registering ? <>Good habits.<br />A fresh beginning.</> : <>Welcome back.<br />Make yourself at home.</>}</h1><p>{registering ? 'Start with your food habits. Discover personalised guidance and keep your assessments in one place.' : 'Your food habits, your saved guidance and your next steps. Pick up where you left off.'}</p><img src="/media/food/fresh-food-640.webp" width="640" height="426" alt="Fresh vegetables and leafy herbs arranged together on a kitchen worktop." decoding="async" /><a href="#/" className="text-link">← Back to SmartKai</a></section>
    {['forgot-password','reset-password'].includes(mode)?<PasswordRecovery key={mode} client={client} mode={mode}/>:<EvaluatorStorage client={client} authMode={mode} />}
  </div>;
}
