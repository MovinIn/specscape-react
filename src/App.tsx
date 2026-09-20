import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAdmin, RequireAuth } from './auth/RequireAuth'
import { NotifierProvider } from './components/Notifier'
import { Layout } from './layout/Layout'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const ContributePage = lazy(() => import('./pages/ContributePage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const HardwarePage = lazy(() => import('./pages/HardwarePage'))
const DatasetsPage = lazy(() => import('./pages/DatasetsPage'))
const OpenSourcePage = lazy(() => import('./pages/OpenSourcePage'))
const PartnersPage = lazy(() => import('./pages/PartnersPage'))
const PublicationsPage = lazy(() => import('./pages/PublicationsPage'))
const ApiSpecPage = lazy(() => import('./pages/ApiSpecPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const SensorSetupPage = lazy(() => import('./pages/SensorSetupPage'))
const WorkWithUsPage = lazy(() => import('./pages/WorkWithUsPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const LogoutPage = lazy(() => import('./pages/LogoutPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ActivatePage = lazy(() => import('./pages/ActivatePage'))
const ReactivatePage = lazy(() => import('./pages/ReactivatePage'))
const RecoverPage = lazy(() => import('./pages/RecoverPage'))
const SensorsPage = lazy(() => import('./pages/SensorsPage'))
const SensorFormPage = lazy(() => import('./pages/SensorFormPage'))
const SensorTokenPage = lazy(() => import('./pages/SensorTokenPage'))
const SpecMonPage = lazy(() => import('./pages/SpecMonPage'))
const OccupancyPage = lazy(() => import('./pages/OccupancyPage'))
const RankingPage = lazy(() => import('./pages/RankingPage'))
const IqDatasetsPage = lazy(() => import('./pages/IqDatasetsPage'))
const SpectrumDecoderPage = lazy(() => import('./pages/SpectrumDecoderPage'))
const StreamingStatusPage = lazy(() => import('./pages/StreamingStatusPage'))
const CampaignPage = lazy(() => import('./pages/CampaignPage'))
const SponsoringListPage = lazy(() => import('./pages/SponsoringListPage'))
const SponsoringStatsPage = lazy(() => import('./pages/SponsoringStatsPage'))
const SponsoringApplicationPage = lazy(
  () => import('./pages/SponsoringApplicationPage'),
)

function Fallback() {
  return <div className="loading-screen">Loading…</div>
}

function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />

          <Route path="contribute" element={<ContributePage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="hardware" element={<HardwarePage />} />
          <Route path="datasets" element={<DatasetsPage />} />
          <Route path="open-source" element={<OpenSourcePage />} />
          <Route path="partners" element={<PartnersPage />} />
          <Route path="publications" element={<PublicationsPage />} />
          <Route path="api-spec" element={<ApiSpecPage />} />
          <Route path="join" element={<JoinPage />} />
          <Route path="sensor-setup" element={<SensorSetupPage />} />
          <Route path="work-with-us" element={<WorkWithUsPage />} />
          <Route path="terms-of-service" element={<TermsPage />} />
          <Route path="privacy-policy" element={<PrivacyPage />} />
          <Route path="contact" element={<ContactPage />} />

          <Route path="login" element={<LoginPage />} />
          <Route path="logout" element={<LogoutPage />} />
          <Route path="account/register" element={<RegisterPage />} />
          <Route
            path="account/edit"
            element={
              <RequireAuth>
                <RegisterPage />
              </RequireAuth>
            }
          />
          <Route path="account/activate/:uid/:token" element={<ActivatePage />} />
          <Route
            path="account/reactivate/:uid/:token"
            element={<ReactivatePage />}
          />
          <Route path="account/recover" element={<RecoverPage />} />
          <Route path="account/recover/:uid/:token" element={<RecoverPage />} />

          <Route
            path="sensors"
            element={
              <RequireAuth>
                <SensorsPage />
              </RequireAuth>
            }
          />
          <Route
            path="sensors/:sensorId"
            element={
              <RequireAuth>
                <SensorFormPage />
              </RequireAuth>
            }
          />
          <Route
            path="sensor-token"
            element={
              <RequireAuth>
                <SensorTokenPage />
              </RequireAuth>
            }
          />
          <Route
            path="specmon"
            element={
              <RequireAuth>
                <SpecMonPage />
              </RequireAuth>
            }
          />
          <Route
            path="occupancy"
            element={
              <RequireAuth>
                <OccupancyPage />
              </RequireAuth>
            }
          />
          <Route
            path="ranking"
            element={
              <RequireAuth>
                <RankingPage />
              </RequireAuth>
            }
          />
          <Route
            path="iq-datasets"
            element={
              <RequireAuth>
                <IqDatasetsPage />
              </RequireAuth>
            }
          />
          <Route
            path="spectrum-decoder"
            element={
              <RequireAuth>
                <SpectrumDecoderPage />
              </RequireAuth>
            }
          />

          <Route
            path="spectrum-decoder-status"
            element={
              <RequireAdmin>
                <StreamingStatusPage />
              </RequireAdmin>
            }
          />
          <Route
            path="campaign-management"
            element={
              <RequireAdmin>
                <CampaignPage />
              </RequireAdmin>
            }
          />
          <Route
            path="sensor-application-list"
            element={
              <RequireAdmin>
                <SponsoringListPage />
              </RequireAdmin>
            }
          />
          <Route
            path="sensor-application-statistics"
            element={
              <RequireAdmin>
                <SponsoringStatsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="sensor-application/:appId"
            element={
              <RequireAuth>
                <SponsoringApplicationPage />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/sensors" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotifierProvider>
          <AppRoutes />
        </NotifierProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
