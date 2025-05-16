import React, { useState } from 'react';
import {
  Box,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = [
  '#60A5FA', '#F472B6', '#34D399', '#FBBF24', '#A78BFA',
  '#F87171', '#45B7C6', '#FB923C', '#4ADE80', '#E879F9'
];

const formatCurrency = (value) => {
  if (typeof value === 'string' && value.includes(' ')) {
    return parseFloat(value.split(' ')[0]);
  }
  return typeof value === 'number' ? value : parseFloat(value || 0);
};

const getQuarter = (period) => {
  const [year, month] = period.split('-');
  const quarter = Math.ceil(parseInt(month) / 3);
  return `${year}-Q${quarter}`;
};

const ChartView = ({ data }) => {
  const [chartType, setChartType] = useState('revenue');
  const [timeFrame, setTimeFrame] = useState('quarter');
  const [viewType, setViewType] = useState('bar');

  if (!data) return null;

  // Prepare data for different views
  const prepareRevenueByQuarter = () => {
    const quarterData = {};
    data.periodSummary.forEach(period => {
      const quarter = getQuarter(period.Period);
      if (!quarterData[quarter]) {
        quarterData[quarter] = {
          period: quarter,
          revenue: 0,
          artistRevenue: 0,
          tracks: 0
        };
      }
      quarterData[quarter].revenue += formatCurrency(period.TotalRevenue);
      quarterData[quarter].artistRevenue += formatCurrency(period.ArtistRevenue);
      quarterData[quarter].tracks += period.Tracks;
    });
    return Object.values(quarterData).sort((a, b) => a.period.localeCompare(b.period));
  };

  const prepareRevenueByArtist = () => {
    return data.artistSummary.map(artist => ({
      name: artist.Artist,
      revenue: formatCurrency(artist.TotalRevenue),
      artistRevenue: formatCurrency(artist.ArtistRevenue),
      tracks: artist.Tracks
    })).sort((a, b) => b.revenue - a.revenue);
  };

  const prepareRevenueByTrack = () => {
    return data.trackSummary.map(track => ({
      name: track.Track,
      revenue: formatCurrency(track.TotalRevenue),
      artistRevenue: formatCurrency(track.ArtistRevenue),
      artist: track.Artist
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 10); // Top 10 tracks
  };

  const getChartData = () => {
    switch (chartType) {
      case 'revenue':
        return timeFrame === 'quarter' ? prepareRevenueByQuarter() : prepareRevenueByArtist();
      case 'tracks':
        return prepareRevenueByTrack();
      default:
        return [];
    }
  };

  const renderBarChart = () => {
    const chartData = getChartData();
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={chartType === 'revenue' ? (timeFrame === 'quarter' ? 'period' : 'name') : 'name'}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis />
          <Tooltip
            formatter={(value, name) => {
              if (name.includes('revenue')) {
                return [`${value.toFixed(2)} EUR`, name];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Bar dataKey="revenue" name="Total Revenue" fill="#60A5FA" />
          <Bar dataKey="artistRevenue" name="Artist Revenue" fill="#F472B6" />
          {chartType === 'revenue' && <Bar dataKey="tracks" name="Tracks" fill="#34D399" />}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => {
    const chartData = getChartData().map(item => ({
      name: item.name || item.period,
      value: item.revenue
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={150}
            fill="#8884d8"
            label={({ name, value }) => `${name}: ${value.toFixed(2)} EUR`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value.toFixed(2)} EUR`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>View</InputLabel>
              <Select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                label="View"
              >
                <MenuItem value="revenue">Revenue Analysis</MenuItem>
                <MenuItem value="tracks">Top Tracks</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {chartType === 'revenue' && (
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Time Frame</InputLabel>
                <Select
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value)}
                  label="Time Frame"
                >
                  <MenuItem value="quarter">By Quarter</MenuItem>
                  <MenuItem value="artist">By Artist</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={(e, value) => value && setViewType(value)}
              aria-label="chart type"
              fullWidth
            >
              <ToggleButton value="bar">Bar Chart</ToggleButton>
              <ToggleButton value="pie">Pie Chart</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>

        <Box sx={{ height: 400, width: '100%' }}>
          {viewType === 'bar' ? renderBarChart() : renderPieChart()}
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Revenue
            </Typography>
            <Typography variant="h6">
              {formatCurrency(data.summary.totalRevenue).toFixed(2)} EUR
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Artist Revenue
            </Typography>
            <Typography variant="h6">
              {formatCurrency(data.summary.totalArtistRevenue).toFixed(2)} EUR
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Tracks
            </Typography>
            <Typography variant="h6">
              {data.summary.uniqueTracksCount}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Artists
            </Typography>
            <Typography variant="h6">
              {data.summary.uniqueArtistsCount}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ChartView; 