import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone } from 'react-dropzone';
import config from '../config';

function TemplateDialog({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [mappings, setMappings] = useState([
    { source: '', target: '' }
  ]);
  const [availableHeaders, setAvailableHeaders] = useState([]);
  const [error, setError] = useState(null);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading file to:', `${config.API_URL}${config.TEMPLATE_ENDPOINTS.readHeaders}`);
      const response = await fetch(`${config.API_URL}${config.TEMPLATE_ENDPOINTS.readHeaders}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        let errorMessage = 'Server error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMessage = await response.text();
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Received headers:', data);
      
      if (!data.headers || !Array.isArray(data.headers)) {
        throw new Error('Invalid headers format received from server');
      }

      setAvailableHeaders(data.headers);
      setError(null);
    } catch (err) {
      console.error('Detailed error:', err);
      setError(`Error reading CSV headers: ${err.message}`);
      setAvailableHeaders([]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleAddMapping = () => {
    setMappings([...mappings, { source: '', target: '' }]);
  };

  const handleRemoveMapping = (index) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index, field, value) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
  };

  const handleSave = async () => {
    try {
      if (!isValid()) {
        throw new Error('Please fill in all required fields');
      }

      // Convert mappings to the required format
      const template = {
        name,
        track_column: '',
        artist_column: '',
        upc_column: '',
        revenue_column: '',
        date_column: '',
        currency: 'EUR'  // Default currency
      };

      // Validate required fields
      const requiredFields = ['track_column', 'artist_column', 'revenue_column', 'date_column'];
      
      // Fill in the mapped fields
      mappings.forEach(({ source, target }) => {
        if (source && target) {
          template[`${target}`] = source;
        }
      });

      // Check if all required fields are mapped
      const missingFields = requiredFields.filter(field => !template[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Send the template to the server
      const response = await fetch(`${config.API_URL}${config.TEMPLATE_ENDPOINTS.create}`, {
        method: 'POST',
        headers: config.DEFAULT_HEADERS,
        body: JSON.stringify(template)
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
      console.log('Template saved:', savedTemplate);

      onSave(savedTemplate);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      setError(`Failed to save template: ${error.message}`);
    }
  };

  const handleReset = () => {
    setName('');
    setMappings([{ source: '', target: '' }]);
    setAvailableHeaders([]);
    setError(null);
  };

  const isValid = () => {
    return name.trim() !== '' && 
           mappings.some(m => m.source.trim() !== '' && m.target.trim() !== '');
  };

  const requiredFields = [
    'track_column',
    'artist_column',
    'upc_column',
    'revenue_column',
    'date_column',
    'currency'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Column Template</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Box
            {...getRootProps()}
            sx={{
              p: 2,
              mb: 3,
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography>
              {isDragActive ? 'Drop the CSV here' : 'Drag & drop a CSV file or click to select'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This will help by reading the column headers
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="subtitle1" gutterBottom>
            Column Mappings
          </Typography>

          {mappings.map((mapping, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Source Column</InputLabel>
                <Select
                  value={mapping.source}
                  onChange={(e) => handleMappingChange(index, 'source', e.target.value)}
                  label="Source Column"
                  size="small"
                >
                  {availableHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Target Column</InputLabel>
                <Select
                  value={mapping.target}
                  onChange={(e) => handleMappingChange(index, 'target', e.target.value)}
                  label="Target Column"
                  size="small"
                >
                  {requiredFields.map((field) => (
                    <MenuItem key={field} value={field}>
                      {field}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton 
                onClick={() => handleRemoveMapping(index)}
                disabled={mappings.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddMapping}
            sx={{ mt: 1 }}
          >
            Add Mapping
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!isValid()} color="primary">
          Save Template
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TemplateDialog; 