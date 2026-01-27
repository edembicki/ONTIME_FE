import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <ConfigProvider locale={ptBR}>
      <Dashboard />
    </ConfigProvider>
  );
}

export default App;
