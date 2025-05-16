import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';

const EditTemplateDialog = ({ open, onClose, template, onSave }) => {
  const [editedTemplate, setEditedTemplate] = useState({
    name: '',
    track_column: '',
    artist_column: '',
    revenue_column: '',
    date_column: ''
  });

  useEffect(() => {
    if (template) {
      setEditedTemplate({
        name: template.name || '',
        track_column: template.track_column || '',
        artist_column: template.artist_column || '',
        revenue_column: template.revenue_column || '',
        date_column: template.date_column || ''
      });
    }
  }, [template]);

  const handleChange = (field) => (event) => {
    setEditedTemplate(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = () => {
    onSave(editedTemplate);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Template</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Template Name"
            value={editedTemplate.name}
            onChange={handleChange('name')}
            fullWidth
          />
          <TextField
            label="Track Column"
            value={editedTemplate.track_column}
            onChange={handleChange('track_column')}
            fullWidth
          />
          <TextField
            label="Artist Column"
            value={editedTemplate.artist_column}
            onChange={handleChange('artist_column')}
            fullWidth
          />
          <TextField
            label="Revenue Column"
            value={editedTemplate.revenue_column}
            onChange={handleChange('revenue_column')}
            fullWidth
          />
          <TextField
            label="Date Column"
            value={editedTemplate.date_column}
            onChange={handleChange('date_column')}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTemplateDialog; 