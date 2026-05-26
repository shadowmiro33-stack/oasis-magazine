import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('./pages/PublicMagazine', () => function PublicMagazineMock() {
  return <div>Public magazine</div>;
});

test('renders the public magazine route', () => {
  render(
    <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>
  );

  expect(screen.getByText(/public magazine/i)).toBeInTheDocument();
});
