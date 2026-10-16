/** Data transport and the local UI role are separate choices. */
export const isPreview =
  import.meta.env.VITE_USE_MOCK_API === 'true' ||
  import.meta.env.VITE_USE_MOCK_API === '1'

export const isLocalAdmin =
  isPreview || import.meta.env.VITE_LOCAL_ADMIN === 'true'
