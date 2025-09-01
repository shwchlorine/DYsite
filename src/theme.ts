import { extendTheme, ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const theme = extendTheme({
  config, // 👈 pass config here
  semanticTokens: {
    colors: {
      bg: {
        default: '#ECEFF4',
        _dark: '#1E2428',
      },
    },
  },
  styles: {
    global: {
      'html, body': {
        fontFamily: 'mundial, sans-serif',
        fontWeight: 300,
        fontStyle: 'normal',
      },
    },
  },
})

export default theme
