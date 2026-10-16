export const pageInfo: Record<
  string,
  { title: string; group: string; description: string }
> = {
  '/api-spec': {
    title: 'Data API',
    group: 'DEVELOPER RESOURCES',
    description: 'An open interface to a world of spectrum measurements.',
  },
  '/datasets': {
    title: 'Open datasets',
    group: 'RESEARCH LIBRARY',
    description: 'Shared measurements. New opportunities for discovery.',
  },
  '/publications': {
    title: 'Research & publications',
    group: 'RESEARCH LIBRARY',
    description: 'Explore the science behind the network.',
  },
  '/hardware': {
    title: 'Compatible hardware',
    group: 'THE INSTRUMENTS',
    description: 'Small sensors. A much bigger perspective.',
  },
  '/open-source': {
    title: 'Open source',
    group: 'BUILD TOGETHER',
    description: 'Explore the software and hardware powering SpecScape.',
  },
  '/partners': {
    title: 'Our partners',
    group: 'THE NETWORK',
    description: 'Research is stronger when it is shared.',
  },
  '/faq': {
    title: 'Questions, answered.',
    group: 'SUPPORT',
    description: 'Everything you need to get started.',
  },
  '/contact': {
    title: 'Start a conversation.',
    group: 'CONNECT',
    description: 'Ideas, questions and new possibilities.',
  },
  '/join': {
    title: 'Join the network.',
    group: 'CONTRIBUTE',
    description: 'Add a new perspective to open spectrum research.',
  },
  '/contribute': {
    title: 'Make your contribution.',
    group: 'CONTRIBUTE',
    description: 'Every sensor is a new window into the spectrum.',
  },
  '/sensor-setup': {
    title: 'Set up your sensor.',
    group: 'GET STARTED',
    description: 'From installation to your first measurement.',
  },
  '/sensor-token': {
    title: 'Registration token',
    group: 'SENSOR WORKSPACE',
    description: 'Connect your hardware to the network.',
  },
  '/work-with-us': {
    title: 'Build with us.',
    group: 'COLLABORATE',
    description: 'Bring your questions to an open research network.',
  },
  '/terms-of-service': {
    title: 'Terms of service',
    group: 'LEGAL',
    description: 'The framework for a shared research network.',
  },
  '/privacy-policy': {
    title: 'Privacy policy',
    group: 'LEGAL',
    description: 'How information is handled across the platform.',
  },
  '/occupancy': {
    title: 'Channel occupancy',
    group: 'SPECTRUM INTELLIGENCE',
    description: 'Understand when and where a frequency band is in use.',
  },
  '/ranking': {
    title: 'Sensor ranking',
    group: 'NETWORK INSIGHTS',
    description: 'Explore the contributors keeping the network connected.',
  },
  '/iq-datasets': {
    title: 'I/Q datasets',
    group: 'RESEARCH LIBRARY',
    description: 'Take the signal into your next experiment.',
  },
  '/spectrum-decoder': {
    title: 'Spectrum decoder',
    group: 'SIGNAL LAB',
    description: 'Tune, inspect and decode a remote radio signal.',
  },
  '/admin/users': {
    title: 'User directory',
    group: 'ADMINISTRATION',
    description: 'A clear view of your research community.',
  },
  '/campaign-management': {
    title: 'Measurement campaigns',
    group: 'ADMINISTRATION',
    description: 'Coordinate sensors. Capture the signals that matter.',
  },
  '/sensor-application-list': {
    title: 'Sponsoring requests',
    group: 'ADMINISTRATION',
    description: 'Manage the next generation of network contributors.',
  },
  '/sensor-application-statistics': {
    title: 'Sponsoring insights',
    group: 'ADMINISTRATION',
    description: 'See how the community is growing.',
  },
  '/spectrum-decoder-status': {
    title: 'Streaming operations',
    group: 'ADMINISTRATION',
    description: 'Sessions, usage and sensor availability at a glance.',
  },
  '/account/edit': {
    title: 'Your profile',
    group: 'ACCOUNT',
    description: 'Make this workspace your own.',
  },
  '/account/register': {
    title: 'Create an account',
    group: 'ACCOUNT',
    description: 'Your next discovery starts here.',
  },
  '/account/recover': {
    title: 'Account recovery',
    group: 'ACCOUNT',
    description: 'Find your way back into the workspace.',
  },
  '/login': {
    title: 'Your workspace',
    group: 'ACCOUNT',
    description: 'Local administrator access is ready.',
  },
  '/logout': {
    title: 'Your workspace',
    group: 'ACCOUNT',
    description: 'Manage your session.',
  },
  '/sensors/manage': {
    title: 'Sensor management',
    group: 'ADMINISTRATION',
    description: 'Manage hardware and inspect controller status.',
  },
}
export function getPageInfo(path: string) {
  return (
    pageInfo[path] ??
    (path.startsWith('/sensors/')
      ? {
          title: path.endsWith('/add') ? 'Add a sensor' : 'Sensor settings',
          group: 'SENSOR WORKSPACE',
          description: 'Configure a new viewpoint on the spectrum.',
        }
      : path.startsWith('/sensor-application/')
        ? {
            title: 'Sponsoring application',
            group: 'ADMINISTRATION',
            description: 'Review the request and manage its status.',
          }
        : path.startsWith('/account/')
          ? {
              title: 'Account access',
              group: 'ACCOUNT',
              description: 'Manage your account and activation.',
            }
          : null)
  )
}
