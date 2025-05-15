import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60A5FA',
      light: '#93C5FD',
      dark: '#2563EB',
    },
    secondary: {
      main: '#F472B6',
      light: '#F9A8D4',
      dark: '#DB2777',
    },
    background: {
      default: '#111827',
      paper: '#1F2937',
    },
    text: {
      primary: '#F3F4F6',
      secondary: '#D1D5DB',
    },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '0.5rem 1.5rem',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
}); 