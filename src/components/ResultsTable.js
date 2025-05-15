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
  if (!value) return '0.00 EUR';
  
  // If the value is already formatted with currency (e.g. "123.45 EUR")
  if (typeof value === 'string' && value.includes(' ')) {
    const [amount, currency] = value.split(' ');
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  }
  
  // If it's just a number, default to EUR
  return `${parseFloat(value).toFixed(2)} EUR`;
};

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
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
    )
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
    if (!filter || !dataArray) return dataArray;
    
    return dataArray.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  };

  const sortData = (dataArray) => {
    if (!dataArray) return [];
    
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
    if (!data) return;
    
    let exportData;
    let fileName = 'revenue_data.csv';
    
    switch (currentTab) {
      case 0: // By Track
        exportData = sortData(filterData(data.trackSummary));
        fileName = 'track_summary.csv';
        break;
      case 1: // By Artist
        exportData = sortData(filterData(data.artistSummary));
        fileName = 'artist_summary.csv';
        break;
      case 2: // By Period
        exportData = sortData(filterData(data.periodSummary));
        fileName = 'period_summary.csv';
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
            <TableCell>Periods</TableCell>
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
          {data?.trackSummary && sortData(filterData(data.trackSummary)).map((row, index) => (
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
          {data?.artistSummary && sortData(filterData(data.artistSummary)).map((row, index) => (
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
          {data?.periodSummary && sortData(filterData(data.periodSummary)).map((row, index) => (
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
          disabled={!data}
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