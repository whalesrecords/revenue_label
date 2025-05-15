import React, { useState, useEffect } from 'react';
import { templates } from '../templates';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box
} from '@mui/material';

const TemplateDialog = ({ open, onClose, onSave }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    if (open && templates[selectedTemplate]) {
      const template = templates[selectedTemplate];
      setTemplateName(template.name);
      setTemplateDescription(template.description);
    }
  }, [open, selectedTemplate]);

  const handleSave = () => {
    const template = {
      ...templates[selectedTemplate],
      name: templateName,
      description: templateDescription
    };
    onSave(template);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sélectionner un Template</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Template de Base</InputLabel>
            <Select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              label="Template de Base"
            >
              {Object.entries(templates).map(([key, template]) => (
                <MenuItem key={key} value={key}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Nom du Template"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            fullWidth
          />

          <TextField
            label="Description"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateDialog; 