import React, { useState } from 'react';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';

function App() {
  const [files, setFiles] = useState([]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        my: 4,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Paper 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              backgroundColor: 'background.paper',
              borderRadius: 2
            }}
          >
            <Typography variant="h5" gutterBottom>
              Welcome to Revenue Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Upload your CSV files to start analyzing your revenue data.
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              sx={{ 
                mt: 2,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 500
              }}
            >
              Get Started
            </Button>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
}

export default App; 