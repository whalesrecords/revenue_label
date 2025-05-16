import React, { useState, useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Box,
  Tabs,
  Tab,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Helper function to format currency values
const formatCurrency = (value) => {
  if (!value && value !== 0) return '0.00 EUR';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(2)} EUR`;
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  
  // Calculate totals
  const totals = data.reduce((acc, row) => {
    headers.forEach(header => {
      if (typeof row[header] === 'string' && row[header].includes(' ')) {
        // Handle currency values
        const [amount] = row[header].split(' ');
        acc[header] = (acc[header] || 0) + parseFloat(amount);
      } else if (typeof row[header] === 'number') {
        acc[header] = (acc[header] || 0) + row[header];
      }
    });
    return acc;
  }, {});

  // Format totals row
  const totalsRow = headers.map(header => {
    if (header === 'Track' || header === 'Artist') return 'TOTAL';
    if (header === 'Periods' || header === 'Sources') return '';
    if (totals[header]) {
      if (header.includes('Revenue')) {
        // Get currency from the first row
        const currency = data[0][header].split(' ')[1] || 'EUR';
        return `${totals[header].toFixed(2)} ${currency}`;
      }
      return totals[header];
    }
    return '';
  });
  
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let value = row[header];
        // Wrap strings containing commas in quotes
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        return value;
      }).join(',')
    ),
    totalsRow.join(',') // Add totals row
  ];
  
  return csvRows.join('\n');
};

// Helper function to download CSV
const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Helper function to get quarter from date
const getQuarter = (period) => {
  if (!period) return '';
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  const quarterNum = Math.ceil(parseInt(month) / 3);
  return `${year}-Q${quarterNum}`;
};

// Helper function to group data by quarter
const groupByQuarter = (data) => {
  const quarterMap = new Map();
  
  data.forEach(item => {
    const quarter = getQuarter(item.period);
    if (!quarterMap.has(quarter)) {
      quarterMap.set(quarter, {
        period: quarter,
        revenue: 0,
        artistRevenue: 0,
        tracks: new Set()
      });
    }
    const quarterData = quarterMap.get(quarter);
    quarterData.revenue += item.revenue;
    quarterData.artistRevenue += item.revenue * 0.7;
    if (item.tracks) {
      item.tracks.forEach(track => quarterData.tracks.add(track));
    }
  });

  return Array.from(quarterMap.values()).map(quarter => ({
    ...quarter,
    tracks: quarter.tracks.size
  }));
};

function ResultsTable({ data }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [sortBy, setSortBy] = useState('revenue');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('all');

  if (!data || !data.breakdowns) return null;

  // Prepare quarters list for filtering
  const quarters = useMemo(() => {
    const uniqueQuarters = new Set();
    data.breakdowns.byPeriod.forEach(period => {
      uniqueQuarters.add(getQuarter(period.period));
    });
    return ['all', ...Array.from(uniqueQuarters).sort()];
  }, [data.breakdowns.byPeriod]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const filterData = (dataArray) => {
    if (!dataArray) return [];
    
    let filtered = dataArray;

    // Apply text filter
    if (filter) {
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          String(value).toLowerCase().includes(filter.toLowerCase())
        )
      );
    }

    // Apply quarter filter if not 'all'
    if (selectedQuarter !== 'all' && currentTab !== 2) { // Don't apply to period view
      filtered = filtered.filter(row => {
        const periods = Array.isArray(row.periods) ? row.periods : [row.period];
        return periods.some(period => getQuarter(period) === selectedQuarter);
      });
    }

    return filtered;
  };

  const sortData = (dataArray) => {
    return [...dataArray].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle numerical values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string values
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  };

  const renderTrackSummary = () => {
    const tracks = filterData(data.breakdowns.byTrack);
    if (!tracks || tracks.length === 0) return null;

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'track'}
                  direction={sortDirection}
                  onClick={() => handleSort('track')}
                >
                  Track
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'artist'}
                  direction={sortDirection}
                  onClick={() => handleSort('artist')}
                >
                  Artist
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'revenue'}
                  direction={sortDirection}
                  onClick={() => handleSort('revenue')}
                >
                  Total Revenue
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Artist Revenue</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortData(tracks).map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.track}</TableCell>
                <TableCell>{row.artist}</TableCell>
                <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                <TableCell align="right">{formatCurrency(row.revenue * 0.7)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderArtistSummary = () => {
    const artists = filterData(data.breakdowns.byArtist);
    if (!artists || artists.length === 0) return null;

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'artist'}
                  direction={sortDirection}
                  onClick={() => handleSort('artist')}
                >
                  Artist
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'revenue'}
                  direction={sortDirection}
                  onClick={() => handleSort('revenue')}
                >
                  Total Revenue
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Artist Revenue</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'trackCount'}
                  direction={sortDirection}
                  onClick={() => handleSort('trackCount')}
                >
                  Tracks
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortData(artists).map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.artist}</TableCell>
                <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                <TableCell align="right">{formatCurrency(row.revenue * 0.7)}</TableCell>
                <TableCell align="right">{row.trackCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderPeriodSummary = () => {
    const periodData = data.breakdowns.byPeriod;
    const quarterData = groupByQuarter(periodData);
    const periods = filterData(quarterData);
    
    if (!periods || periods.length === 0) return null;

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'period'}
                  direction={sortDirection}
                  onClick={() => handleSort('period')}
                >
                  Quarter
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'revenue'}
                  direction={sortDirection}
                  onClick={() => handleSort('revenue')}
                >
                  Total Revenue
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Artist Revenue</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === 'tracks'}
                  direction={sortDirection}
                  onClick={() => handleSort('tracks')}
                >
                  Tracks
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortData(periods).map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.period}</TableCell>
                <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                <TableCell align="right">{formatCurrency(row.artistRevenue)}</TableCell>
                <TableCell align="right">{row.tracks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Summary Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Summary</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Total Revenue</Typography>
            <Typography variant="h6">{formatCurrency(data.summary.totalRevenue)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Artist Revenue</Typography>
            <Typography variant="h6">{formatCurrency(data.summary.totalArtistRevenue)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Total Tracks</Typography>
            <Typography variant="h6">{data.summary.uniqueTracksCount}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Total Artists</Typography>
            <Typography variant="h6">{data.summary.uniqueArtistsCount}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Controls Section */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label="By Track" />
          <Tab label="By Artist" />
          <Tab label="By Quarter" />
        </Tabs>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Filter"
          variant="outlined"
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ width: 300 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Quarter</InputLabel>
          <Select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            label="Quarter"
          >
            {quarters.map(quarter => (
              <MenuItem key={quarter} value={quarter}>
                {quarter === 'all' ? 'All Quarters' : quarter}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={() => {
            // Implement export functionality
          }}
        >
          Export CSV
        </Button>
      </Box>

      {currentTab === 0 && renderTrackSummary()}
      {currentTab === 1 && renderArtistSummary()}
      {currentTab === 2 && renderPeriodSummary()}
    </Box>
  );
}

export default ResultsTable; 