import { Route, Routes } from 'react-router';

import Layout from './Layout.tsx';
import OwnerLayout from './OwnerLayout.tsx';
import CatalogPage from './pages/CatalogPage.tsx';
import HomePage from './pages/HomePage.tsx';
import MeetingTypePage from './pages/MeetingTypePage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import OwnerMeetingsPage from './pages/OwnerMeetingsPage.tsx';
import OwnerMeetingTypesPage from './pages/OwnerMeetingTypesPage.tsx';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="book" element={<CatalogPage />} />
        <Route path="book/:meetingTypeId" element={<MeetingTypePage />} />
        <Route element={<OwnerLayout />}>
          <Route path="owner" element={<OwnerMeetingsPage />} />
          <Route path="owner/types" element={<OwnerMeetingTypesPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
