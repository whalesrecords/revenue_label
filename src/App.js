import React, { useState } from 'react';
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
  CircularProgress
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [files, setFiles] = useState([]);
  const [mergeType, setMergeType] = useState('union');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please upload at least 2 CSV files to merge');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('mergeType', mergeType);

    try {
      const response = await fetch('http://localhost:5000/api/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to merge files');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            CSV Merger
          </Typography>
          
          <Paper
            {...getRootProps()}
            sx={{
              p: 3,
              mb: 3,
              textAlign: 'center',
              backgroundColor: isDragActive ? '#f0f7ff' : '#fff',
              border: '2px dashed #1976d2',
              cursor: 'pointer'
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the files here' : 'Drag & drop CSV files here'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              or click to select files
            </Typography>
          </Paper>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Merge Type</InputLabel>
            <Select
              value={mergeType}
              onChange={(e) => setMergeType(e.target.value)}
              label="Merge Type"
            >
              <MenuItem value="union">Union (Combine all rows)</MenuItem>
              <MenuItem value="join">Join (Match on first column)</MenuItem>
              <MenuItem value="total">Total (Sum numeric values)</MenuItem>
            </Select>
          </FormControl>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {files.length > 0 && (
            <Paper sx={{ mb: 3 }}>
              <List>
                {files.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(2)} KB`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => removeFile(index)}>
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
            onClick={handleMerge}
            disabled={loading || files.length < 2}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Merging...' : 'Merge Files'}
          </Button>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
