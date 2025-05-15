import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  CssBaseline
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ResultsTable from './components/ResultsTable';
import ChartView from './components/ChartView';
import TemplateDialog from './components/TemplateDialog';
import config from './config';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60A5FA', // Un bleu moderne
      light: '#93C5FD',
      dark: '#2563EB',
    },
    secondary: {
      main: '#F472B6', // Un rose moderne
      light: '#F9A8D4',
      dark: '#DB2777',
    },
    background: {
      default: '#111827', // Fond très sombre
      paper: '#1F2937', // Fond des cartes un peu plus clair
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

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [resultsView, setResultsView] = useState('overview');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [mergedResults, setMergedResults] = useState(null);
  const [processingStatus, setProcessingStatus] = useState({ current: 0, total: 0 });

  useEffect(() => {
    // Load templates on mount
    console.log('Fetching templates from:', `${config.API_URL}/templates`);
    fetch(`${config.API_URL}/templates`)
      .then(res => {
        console.log('Templates response:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Received templates:', data);
        setTemplates(data);
      })
      .catch(error => {
        console.error('Error loading templates:', error);
        setTemplates([]);
      });
  }, []);

  const onDrop = (acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    }
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const mergeBatchResults = (batchResults) => {
    const merged = {
      totalRevenue: 0,
      totalArtistRevenue: 0,
      uniqueTracks: new Set(),
      uniqueArtists: new Set(),
      uniquePeriods: new Set(),
      totalRecords: 0,
      processedFiles: []
    };

    batchResults.forEach(result => {
      merged.totalRevenue += parseFloat(result.summary.totalRevenue);
      merged.totalArtistRevenue += parseFloat(result.summary.totalArtistRevenue);
      merged.totalRecords += result.summary.totalRecords;
      result.summary.uniqueTracks.forEach(track => merged.uniqueTracks.add(track));
      result.summary.uniqueArtists.forEach(artist => merged.uniqueArtists.add(artist));
      result.summary.uniquePeriods.forEach(period => merged.uniquePeriods.add(period));
      merged.processedFiles.push(...result.processedFiles);
    });

    return {
      summary: {
        totalFiles: merged.processedFiles.length,
        totalRecords: merged.totalRecords,
        totalRevenue: `${merged.totalRevenue.toFixed(2)} EUR`,
        totalArtistRevenue: `${merged.totalArtistRevenue.toFixed(2)} EUR`,
        uniqueTracks: merged.uniqueTracks.size,
        uniqueArtists: merged.uniqueArtists.size,
        uniquePeriods: merged.uniquePeriods.size
      },
      processedFiles: merged.processedFiles
    };
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysisResults(null);
    setMergedResults(null);
    
    try {
      const batchSize = 10;
      const batches = [];
      
      // Diviser les fichiers en lots
      for (let i = 0; i < files.length; i += batchSize) {
        batches.push(files.slice(i, Math.min(i + batchSize, files.length)));
      }
      
      setProcessingStatus({ current: 0, total: batches.length });
      const batchResults = [];

      // Traiter chaque lot
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setProcessingStatus(prev => ({ ...prev, current: i + 1 }));

        const formData = new FormData();
        batch.forEach(file => {
          console.log('Adding file to batch:', file.name, file.size);
          formData.append('files', file);
        });

        try {
          const response = await fetch(`${config.API_URL}/analyze`, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json',
            },
            credentials: 'omit'
          });

          if (!response.ok) {
            let errorMessage = 'Error processing files';
            try {
              const errorData = await response.json();
              errorMessage = errorData.details || errorData.error || `Server error: ${response.status}`;
            } catch (e) {
              console.error('Error parsing error response:', e);
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();
          console.log('Batch result:', result);
          batchResults.push(result);
          
          // Mettre à jour les résultats partiels
          if (batchResults.length > 0) {
            const partialMerged = mergeBatchResults(batchResults);
            setMergedResults(partialMerged);
          }
        } catch (err) {
          console.error(`Error processing batch ${i + 1}:`, err);
          throw new Error(`Erreur lors du traitement du lot ${i + 1}: ${err.message}`);
        }
      }

      // Fusionner tous les résultats
      const finalResults = mergeBatchResults(batchResults);
      setAnalysisResults(finalResults);
      setTabIndex(1); // Switch to results tab
    } catch (err) {
      console.error('Error analyzing files:', err);
      setError(err.message || 'Erreur lors de l\'analyse des fichiers');
    } finally {
      setLoading(false);
      setProcessingStatus({ current: 0, total: 0 });
    }
  };

  const handleSaveTemplate = async (template) => {
    try {
      console.log('Saving template:', template);
      const response = await fetch(`${config.API_URL}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save template');
      }

      const savedTemplate = await response.json();
      console.log('Template saved successfully:', savedTemplate);
      
      // Update templates list
      setTemplates(prev => {
        const updated = prev.filter(t => t.name !== template.name);
        return [...updated, { name: template.name, ...savedTemplate }];
      });
      
      setTemplateDialogOpen(false);
      setError(null);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.message || 'Failed to save template. Please try again.');
    }
  };

  // Ajouter l'indicateur de progression
  const progressMessage = processingStatus.total > 0 
    ? `Traitement du lot ${processingStatus.current}/${processingStatus.total}` 
    : '';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ 
          my: 4,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            align="center"
            sx={{
              background: 'linear-gradient(45deg, #60A5FA 30%, #F472B6 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4
            }}
          >
            Revenue Analysis
          </Typography>

          <Tabs 
            value={tabIndex} 
            onChange={(_, newValue) => setTabIndex(newValue)} 
            sx={{ 
              mb: 3,
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              }
            }}
          >
            <Tab label="Import" />
            <Tab label="Results" disabled={!analysisResults} />
          </Tabs>

          {tabIndex === 0 && (
            <>
              <Paper
                {...getRootProps()}
                sx={{
                  p: 4,
                  mb: 3,
                  textAlign: 'center',
                  backgroundColor: isDragActive ? 'rgba(96, 165, 250, 0.1)' : 'background.paper',
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(96, 165, 250, 0.05)',
                  }
                }}
              >
                <input {...getInputProps()} />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop the files here' : 'Drag & drop CSV files here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to select files
                </Typography>
              </Paper>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Template</InputLabel>
                  <Select
                    value={selectedTemplate || ''}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label="Template"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {Array.isArray(templates) ? templates.map(template => (
                      <MenuItem key={template.name} value={template.name}>
                        {template.name}
                      </MenuItem>
                    )) : Object.keys(templates).map(name => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button 
                  variant="outlined" 
                  onClick={() => setTemplateDialogOpen(true)}
                  sx={{ 
                    mr: 1,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                    }
                  }}
                >
                  Create Template
                </Button>
              </Box>

              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  }}
                >
                  {error}
                </Alert>
              )}

              {files.length > 0 && (
                <Paper 
                  sx={{ 
                    mb: 3,
                    overflow: 'hidden',
                  }}
                >
                  <List>
                    {files.map((file, index) => (
                      <ListItem 
                        key={index}
                        sx={{
                          '&:not(:last-child)': {
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }
                        }}
                      >
                        <ListItemText 
                          primary={file.name}
                          secondary={`${(file.size / 1024).toFixed(2)} KB`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            onClick={() => removeFile(index)}
                            sx={{
                              '&:hover': {
                                color: 'error.main',
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleAnalyze}
                disabled={loading || files.length === 0}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 'none',
                  }
                }}
              >
                {loading ? 'Analyzing...' : 'Analyze Files'}
              </Button>
            </>
          )}

          {tabIndex === 1 && analysisResults && (
            <Box>
              <Tabs 
                value={resultsView === 'overview' ? 0 : 1}
                onChange={(_, newValue) => setResultsView(newValue === 0 ? 'overview' : 'charts')}
                sx={{ 
                  mb: 3,
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  }
                }}
              >
                <Tab label="Overview" />
                <Tab label="Charts" />
              </Tabs>

              {resultsView === 'overview' ? (
                <ResultsTable data={analysisResults} />
              ) : (
                <ChartView data={analysisResults} />
              )}
            </Box>
          )}

          {loading && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <CircularProgress />
              {progressMessage && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {progressMessage}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <TemplateDialog 
          open={templateDialogOpen}
          onClose={() => setTemplateDialogOpen(false)}
          onSave={handleSaveTemplate}
        />
      </Container>
    </ThemeProvider>
  );
}

export default App;
