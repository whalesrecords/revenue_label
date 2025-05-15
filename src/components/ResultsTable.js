import React, { useState } from 'react';
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
  Button
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Helper function to format currency values
const formatCurrency = (value) => {
  if (!value) return '0.00';
  
  // If the value is already formatted with currency (e.g. "123.45 EUR")
  if (typeof value === 'string' && value.includes(' ')) {
    const [amount, currency] = value.split(' ');
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  }
  
  // If it's just a number
  return typeof value === 'number' ? value.toFixed(2) : parseFloat(value).toFixed(2);
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

// Helper function to convert month period to quarter
const getQuarter = (period) => {
  if (!period) return '';
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  const quarterNum = Math.ceil(parseInt(month) / 3);
  return `${year}-Q${quarterNum}`;
};

// Helper function to group data by quarters
const groupByQuarters = (data) => {
  const grouped = data.reduce((acc, item) => {
    const quarter = getQuarter(item.Period);
    if (!acc[quarter]) {
      acc[quarter] = {
        ...item,
        Period: quarter,
        TotalRevenue: 0,
        ArtistRevenue: 0
      };
    }
    acc[quarter].TotalRevenue += parseFloat(item.TotalRevenue.split(' ')[0]);
    acc[quarter].ArtistRevenue += parseFloat(item.ArtistRevenue.split(' ')[0]);
    return acc;
  }, {});

  return Object.values(grouped).map(item => ({
    ...item,
    TotalRevenue: `${item.TotalRevenue.toFixed(2)} ${item.TotalRevenue.split(' ')[1] || 'EUR'}`,
    ArtistRevenue: `${item.ArtistRevenue.toFixed(2)} ${item.ArtistRevenue.split(' ')[1] || 'EUR'}`
  }));
};

// Helper function to format filename
const formatFileName = (artist, period) => {
  const quarter = getQuarter(period);
  return `Statement_whalesrecords_${artist.toLowerCase().replace(/\s+/g, '')}_${quarter}.csv`;
};

function ResultsTable({ data }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [sortBy, setSortBy] = useState('TotalRevenue');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const filterData = (dataArray) => {
    if (!filter) return dataArray;
    
    return dataArray.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  };

  const sortData = (dataArray) => {
    return [...dataArray].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle currency values
      if (typeof aValue === 'string' && aValue.includes(' ')) {
        aValue = parseFloat(aValue.split(' ')[0]);
      }
      if (typeof bValue === 'string' && bValue.includes(' ')) {
        bValue = parseFloat(bValue.split(' ')[0]);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleExport = () => {
    let exportData;
    let fileName;
    
    switch (currentTab) {
      case 0: // By Track
        exportData = sortData(filterData(data.trackSummary));
        if (exportData.length > 0) {
          const artist = exportData[0].Artist;
          const latestPeriod = exportData[0].Periods.split(', ').sort().pop();
          fileName = formatFileName(artist, latestPeriod);
        } else {
          fileName = 'track_summary.csv';
        }
        break;
      case 1: // By Artist
        exportData = sortData(filterData(data.artistSummary));
        if (exportData.length > 0) {
          const artist = exportData[0].Artist;
          const latestPeriod = exportData[0].Periods.split(', ').sort().pop();
          fileName = formatFileName(artist, latestPeriod);
        } else {
          fileName = 'artist_summary.csv';
        }
        break;
      case 2: // By Period
        exportData = groupByQuarters(sortData(filterData(data.periodSummary)));
        if (exportData.length > 0) {
          const artist = data.artistSummary[0]?.Artist || 'all';
          fileName = formatFileName(artist, exportData[0].Period);
        } else {
          fileName = 'period_summary.csv';
        }
        break;
      default:
        return;
    }
    
    const csvContent = convertToCSV(exportData);
    downloadCSV(csvContent, fileName);
  };

  const renderTrackSummary = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'Track'}
                direction={sortBy === 'Track' ? sortDirection : 'asc'}
                onClick={() => handleSort('Track')}
              >
                Track
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'Artist'}
                direction={sortBy === 'Artist' ? sortDirection : 'asc'}
                onClick={() => handleSort('Artist')}
              >
                Artist
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'Periods'}
                direction={sortBy === 'Periods' ? sortDirection : 'asc'}
                onClick={() => handleSort('Periods')}
              >
                Periods
              </TableSortLabel>
            </TableCell>
            <TableCell>Sources</TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'TotalRevenue'}
                direction={sortBy === 'TotalRevenue' ? sortDirection : 'asc'}
                onClick={() => handleSort('TotalRevenue')}
              >
                Total Revenue
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'ArtistRevenue'}
                direction={sortBy === 'ArtistRevenue' ? sortDirection : 'asc'}
                onClick={() => handleSort('ArtistRevenue')}
              >
                Artist Revenue
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortData(filterData(data.trackSummary)).map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.Track}</TableCell>
              <TableCell>{row.Artist}</TableCell>
              <TableCell>{row.Periods}</TableCell>
              <TableCell>{row.Sources}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalRevenue)}</TableCell>
              <TableCell align="right">{formatCurrency(row.ArtistRevenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderArtistSummary = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'Artist'}
                direction={sortBy === 'Artist' ? sortDirection : 'asc'}
                onClick={() => handleSort('Artist')}
              >
                Artist
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'TrackCount'}
                direction={sortBy === 'TrackCount' ? sortDirection : 'asc'}
                onClick={() => handleSort('TrackCount')}
              >
                Tracks
              </TableSortLabel>
            </TableCell>
            <TableCell>Periods</TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'TotalRevenue'}
                direction={sortBy === 'TotalRevenue' ? sortDirection : 'asc'}
                onClick={() => handleSort('TotalRevenue')}
              >
                Total Revenue
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'ArtistRevenue'}
                direction={sortBy === 'ArtistRevenue' ? sortDirection : 'asc'}
                onClick={() => handleSort('ArtistRevenue')}
              >
                Artist Revenue
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortData(filterData(data.artistSummary)).map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.Artist}</TableCell>
              <TableCell align="right">{row.TrackCount}</TableCell>
              <TableCell>{row.Periods}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalRevenue)}</TableCell>
              <TableCell align="right">{formatCurrency(row.ArtistRevenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderPeriodSummary = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortBy === 'Period'}
                direction={sortBy === 'Period' ? sortDirection : 'asc'}
                onClick={() => handleSort('Period')}
              >
                Period
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'TrackCount'}
                direction={sortBy === 'TrackCount' ? sortDirection : 'asc'}
                onClick={() => handleSort('TrackCount')}
              >
                Tracks
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'ArtistCount'}
                direction={sortBy === 'ArtistCount' ? sortDirection : 'asc'}
                onClick={() => handleSort('ArtistCount')}
              >
                Artists
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'TotalRevenue'}
                direction={sortBy === 'TotalRevenue' ? sortDirection : 'asc'}
                onClick={() => handleSort('TotalRevenue')}
              >
                Total Revenue
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === 'ArtistRevenue'}
                direction={sortBy === 'ArtistRevenue' ? sortDirection : 'asc'}
                onClick={() => handleSort('ArtistRevenue')}
              >
                Artist Revenue
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortData(filterData(data.periodSummary)).map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.Period}</TableCell>
              <TableCell align="right">{row.TrackCount}</TableCell>
              <TableCell align="right">{row.ArtistCount}</TableCell>
              <TableCell align="right">{formatCurrency(row.TotalRevenue)}</TableCell>
              <TableCell align="right">{formatCurrency(row.ArtistRevenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (!data) {
    return <Box p={2}>No data to display</Box>;
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="By Track" />
          <Tab label="By Artist" />
          <Tab label="By Period" />
        </Tabs>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          label="Search"
          variant="outlined"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          fullWidth
        />
      </Box>

      {currentTab === 0 && renderTrackSummary()}
      {currentTab === 1 && renderArtistSummary()}
      {currentTab === 2 && renderPeriodSummary()}
    </Box>
  );
}

export default ResultsTable; 