import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ChartView = ({ data }) => {
  const theme = useTheme();

  if (!data || !data.summary) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Aucune donnée disponible pour les graphiques
        </Typography>
      </Box>
    );
  }

  // Préparer les données pour les graphiques
  const revenueData = {
    total: parseFloat(data.summary.totalRevenue),
    artist: parseFloat(data.summary.totalArtistRevenue),
    label: parseFloat(data.summary.totalRevenue) - parseFloat(data.summary.totalArtistRevenue)
  };

  const pieData = [
    { name: 'Revenus Artistes (70%)', value: revenueData.artist },
    { name: 'Revenus Label (30%)', value: revenueData.label }
  ];

  const COLORS = [theme.palette.primary.main, theme.palette.secondary.main];

  // Formatter pour les valeurs monétaires
  const formatEuros = (value) => `${value.toFixed(2)} €`;

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={3}>
        {/* Graphique en secteurs de la répartition des revenus */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" gutterBottom align="center">
              Répartition des Revenus
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={130}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatEuros} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Statistiques générales */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" gutterBottom align="center">
              Statistiques Générales
            </Typography>
            <Box sx={{ mt: 4 }}>
              <Typography variant="body1" gutterBottom>
                Nombre total de fichiers : {data.summary.totalFiles}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Nombre total d'enregistrements : {data.summary.totalRecords}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Titres uniques : {data.summary.uniqueTracks}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Artistes uniques : {data.summary.uniqueArtists}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Périodes couvertes : {data.summary.uniquePeriods}
              </Typography>
              <Typography variant="h6" sx={{ mt: 3, color: theme.palette.primary.main }}>
                Revenu Total : {data.summary.totalRevenue}
              </Typography>
              <Typography variant="h6" sx={{ color: theme.palette.secondary.main }}>
                Revenu Artistes : {data.summary.totalArtistRevenue}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Graphique des fichiers traités */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" gutterBottom align="center">
              Taille des Fichiers Traités
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.processedFiles}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis
                  label={{ value: 'Taille (MB)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip formatter={(value) => `${value} MB`} />
                <Bar
                  dataKey="size"
                  fill={theme.palette.primary.main}
                  name="Taille du fichier"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChartView; 