import React, { useState, useEffect } from 'react';
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
import EditIcon from '@mui/icons-material/Edit';

function EditTemplateDialog({ open, onClose, template, onSave }) {
  const [editedTemplate, setEditedTemplate] = useState(template || {});

  useEffect(() => {
    setEditedTemplate(template || {});
  }, [template]);

  const handleChange = (field) => (event) => {
    setEditedTemplate({
      ...editedTemplate,
      [field]: event.target.value
    });
  };

  const handleSave = () => {
    onSave(editedTemplate);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Template</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            value={editedTemplate.name || ''}
            onChange={handleChange('name')}
            fullWidth
          />
          <TextField
            label="Track Column"
            value={editedTemplate.track_column || ''}
            onChange={handleChange('track_column')}
            fullWidth
          />
          <TextField
            label="Artist Column"
            value={editedTemplate.artist_column || ''}
            onChange={handleChange('artist_column')}
            fullWidth
          />
          <TextField
            label="UPC Column"
            value={editedTemplate.upc_column || ''}
            onChange={handleChange('upc_column')}
            fullWidth
          />
          <TextField
            label="Revenue Column"
            value={editedTemplate.revenue_column || ''}
            onChange={handleChange('revenue_column')}
            fullWidth
          />
          <TextField
            label="Date Column"
            value={editedTemplate.date_column || ''}
            onChange={handleChange('date_column')}
            fullWidth
          />
          <TextField
            label="Source"
            value={editedTemplate.source || ''}
            onChange={handleChange('source')}
            fullWidth
          />
          <TextField
            label="Currency"
            value={editedTemplate.currency || ''}
            onChange={handleChange('currency')}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditTemplateDialog; 