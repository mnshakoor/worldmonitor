import { render } from 'preact';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './components/App.tsx';

render(<App />, document.getElementById('app')!);
