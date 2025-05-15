import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme
} from '@mui/material';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';

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
            <ResponsivePie
              data={pieData}
              colors={COLORS}
              margin={{
                top: 40,
                right: 80,
                bottom: 80,
                left: 80
              }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              borderWidth={1}
              borderColor={{
                from: 'color',
                modifiers: [
                  [
                    'darker',
                    0.2
                  ],
                  [
                    'brighter',
                    0.2
                  ]
                ]
              }}
              enableArcLabels={false}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{
                from: 'color',
                modifiers: [
                  [
                    'darker',
                    0.4
                  ]
                ]
              }}
              defs={[
                {
                  id: 'dots',
                  type: 'patternDots',
                  background: 'inherit',
                  color: '#38bcb2',
                  size: 4,
                  padding: 1,
                  stagger: true
                },
                {
                  id: 'lines',
                  type: 'patternLines',
                  background: 'inherit',
                  color: '#eed312',
                  rotation: -45,
                  lineWidth: 6,
                  spacing: 10
                }
              ]}
              fill={[
                {
                  match: {
                    id: 'Revenus Artistes (70%)'
                  },
                  id: 'dots'
                },
                {
                  match: {
                    id: 'Revenus Label (30%)'
                  },
                  id: 'lines'
                }
              ]}
            />
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
            <ResponsiveBar
              data={data.processedFiles}
              keys={['size']}
              indexBy="name"
              margin={{
                top: 50,
                right: 100,
                bottom: 50,
                left: 60
              }}
              padding={0.3}
              colors={{ scheme: 'nivo' }}
              defs={[
                {
                  id: 'dots',
                  type: 'patternDots',
                  background: 'inherit',
                  color: '#38bcb2',
                  size: 4,
                  padding: 1,
                  stagger: true
                },
                {
                  id: 'lines',
                  type: 'patternLines',
                  background: 'inherit',
                  color: '#eed312',
                  rotation: -45,
                  lineWidth: 6,
                  spacing: 10
                }
              ]}
              fill={[
                {
                  match: {
                    id: 'Revenus Artistes (70%)'
                  },
                  id: 'dots'
                },
                {
                  match: {
                    id: 'Revenus Label (30%)'
                  },
                  id: 'lines'
                }
              ]}
              borderColor={{
                from: 'color',
                modifiers: [
                  [
                    'darker',
                    0.4
                  ]
                ]
              }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'fichiers',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'taille',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{
                from: 'color',
                modifiers: [
                  [
                    'darker',
                    0.8
                  ]
                ]
              }}
              legends={[
                {
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 20,
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChartView; 