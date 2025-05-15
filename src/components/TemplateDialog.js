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
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

function TemplateDialog({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [mappings, setMappings] = useState([
    { source: '', target: '' }
  ]);

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

  const handleSave = () => {
    const template = {
      name,
      mapping: mappings.reduce((acc, { source, target }) => {
        if (source && target) {
          acc[source] = target;
        }
        return acc;
      }, {})
    };
    onSave(template);
    handleReset();
  };

  const handleReset = () => {
    setName('');
    setMappings([{ source: '', target: '' }]);
  };

  const isValid = () => {
    return name.trim() !== '' && 
           mappings.some(m => m.source.trim() !== '' && m.target.trim() !== '');
  };

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

          <Typography variant="subtitle1" gutterBottom>
            Column Mappings
          </Typography>

          {mappings.map((mapping, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Source Column"
                value={mapping.source}
                onChange={(e) => handleMappingChange(index, 'source', e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Target Column"
                value={mapping.target}
                onChange={(e) => handleMappingChange(index, 'target', e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
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