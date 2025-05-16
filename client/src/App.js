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
  CssBaseline,
  Grid
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ResultsTable from './components/ResultsTable';
import ChartView from './components/ChartView';
import TemplateDialog from './components/TemplateDialog';
import EditTemplateDialog from './components/EditTemplateDialog';
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
  const [processingStatus, setProcessingStatus] = useState({ current: 0, total: 0 });
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState(null);

  useEffect(() => {
    // Load templates on mount
    const loadTemplates = async () => {
      try {
        const endpoint = `${config.API_URL}${config.TEMPLATE_ENDPOINTS.get}`;
        console.info('Fetching templates from:', endpoint);
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: config.DEFAULT_HEADERS,
          mode: 'cors',
          credentials: 'omit'
        });
        
        const responseText = await response.text();
        console.info('Raw response:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Error parsing response:', e);
          throw new Error(`Failed to parse response: ${responseText}`);
        }

        if (!response.ok) {
          throw new Error(data?.error || `Server error: ${response.status}`);
        }

        if (!Array.isArray(data)) {
          console.error('Invalid data format:', data);
          throw new Error('Invalid templates data format received');
        }
        
        console.info('Received templates:', data);
        setTemplates(data);
        setError(null);
      } catch (err) {
        console.error('Error loading templates:', err);
        setError(`Failed to load templates: ${err.message}`);
        setTemplates([]);
      }
    };

    loadTemplates();
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
      merged.totalRevenue += result.summary.totalRevenue;
      merged.totalArtistRevenue += result.summary.totalArtistRevenue;
      merged.totalRecords += result.summary.totalRecords;
      
      // Gestion des tableaux
      if (Array.isArray(result.summary.uniqueTracks)) {
        result.summary.uniqueTracks.forEach(track => merged.uniqueTracks.add(track));
      }
      if (Array.isArray(result.summary.uniqueArtists)) {
        result.summary.uniqueArtists.forEach(artist => merged.uniqueArtists.add(artist));
      }
      if (Array.isArray(result.summary.uniquePeriods)) {
        result.summary.uniquePeriods.forEach(period => merged.uniquePeriods.add(period));
      }
      
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

  const transformServerResponse = (response) => {
    if (!response || !response.breakdowns) return null;

    // Transform track data
    const trackSummary = response.breakdowns.byTrack.map(track => ({
      Track: track.track,
      Artist: track.artist,
      TotalRevenue: `${track.revenue.toFixed(2)} EUR`,
      ArtistRevenue: `${(track.revenue * 0.7).toFixed(2)} EUR`
    }));

    // Transform artist data
    const artistSummary = response.breakdowns.byArtist.map(artist => ({
      Artist: artist.artist,
      TotalRevenue: `${artist.revenue.toFixed(2)} EUR`,
      ArtistRevenue: `${(artist.revenue * 0.7).toFixed(2)} EUR`,
      Tracks: artist.trackCount,
      TrackList: artist.tracks.join(', ')
    }));

    // Transform period data
    const periodSummary = response.breakdowns.byPeriod.map(period => ({
      Period: period.period,
      TotalRevenue: `${period.revenue.toFixed(2)} EUR`,
      ArtistRevenue: `${(period.revenue * 0.7).toFixed(2)} EUR`,
      Tracks: period.trackCount,
      TrackList: period.tracks.join(', ')
    }));

    return {
      summary: {
        totalFiles: response.summary.totalFiles,
        totalRecords: response.summary.totalRecords,
        totalRevenue: response.summary.totalRevenue,
        totalArtistRevenue: response.summary.totalArtistRevenue
      },
      trackSummary,
      artistSummary,
      periodSummary,
      errors: response.errors
    };
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to analyze');
      return;
    }

    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResults(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files[]', file);
      });
      formData.append('template', selectedTemplate);

      const response = await fetch(`${config.API_URL}/analyze`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit'
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON parse error:', e);
        console.error('Raw response:', responseText);
        throw new Error('Failed to parse server response');
      }

      if (!response.ok) {
        throw new Error(responseData?.error || `Server error: ${response.status}`);
      }

      if (!responseData || typeof responseData !== 'object') {
        throw new Error('Invalid response format from server');
      }

      setAnalysisResults(responseData);
      setTabIndex(1); // Switch to results tab
    } catch (err) {
      console.error('Error analyzing files:', err);
      setError(`Failed to analyze files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template) => {
    try {
      if (!template || !template.name) {
        throw new Error('Template name is required');
      }

      // Validate required fields
      const requiredFields = ['track_column', 'artist_column', 'revenue_column', 'date_column'];
      const missingFields = requiredFields.filter(field => !template[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      console.log('Saving template:', template);
      const response = await fetch(`${config.API_URL}${config.TEMPLATE_ENDPOINTS.create}`, {
        method: 'POST',
        headers: config.DEFAULT_HEADERS,
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save template';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = await response.text();
        }
        throw new Error(errorMessage);
      }

      const savedTemplate = await response.json();
      console.log('Template saved successfully:', savedTemplate);
      
      // Update templates list with type checking
      setTemplates(prev => {
        if (!Array.isArray(prev)) {
          console.warn('Previous templates state was not an array, resetting to empty array');
          return [savedTemplate];
        }
        const updated = prev.filter(t => t.name !== template.name);
        return [...updated, savedTemplate];
      });
      
      setTemplateDialogOpen(false);
      setError(null);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(`Failed to save template: ${err.message}`);
      // Ne pas fermer le dialog en cas d'erreur pour permettre à l'utilisateur de corriger
    }
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplateForEdit(template);
    setEditTemplateDialogOpen(true);
  };

  const handleSaveEditedTemplate = async (editedTemplate) => {
    try {
      const response = await fetch(`${config.API_URL}/template`, {
        method: 'PUT',
        headers: config.DEFAULT_HEADERS,
        body: JSON.stringify(editedTemplate)
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      const updatedTemplates = await response.json();
      setTemplates(updatedTemplates);
      setError(null);
    } catch (err) {
      console.error('Error updating template:', err);
      setError(`Failed to update template: ${err.message}`);
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
                      <MenuItem 
                        key={template.name} 
                        value={template.name}
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        {template.name}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template);
                          }}
                          sx={{ ml: 2 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </MenuItem>
                    )) : null}
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

        <EditTemplateDialog
          open={editTemplateDialogOpen}
          onClose={() => setEditTemplateDialogOpen(false)}
          template={selectedTemplateForEdit}
          onSave={handleSaveEditedTemplate}
        />
      </Container>
    </ThemeProvider>
  );
}

export default App;
