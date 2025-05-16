import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ChartView = ({ data }) => {
  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No data available for visualization</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Revenue Overview
        </Typography>
        <Typography>
          Total Revenue: {data.summary?.totalRevenue || '0 EUR'}
        </Typography>
        <Typography>
          Artist Revenue: {data.summary?.totalArtistRevenue || '0 EUR'}
        </Typography>
      </Paper>

      {/* Add more chart components here as needed */}
    </Box>
  );
};

export default ChartView; 