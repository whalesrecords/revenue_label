import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tab } from '@headlessui/react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';

const chartTheme = {
  background: 'transparent',
  textColor: '#333333',
  fontSize: 11,
  axis: {
    domain: {
      line: {
        stroke: '#777777',
        strokeWidth: 1
      }
    },
    ticks: {
      line: {
        stroke: '#777777',
        strokeWidth: 1
      }
    }
  },
  grid: {
    line: {
      stroke: '#dddddd',
      strokeWidth: 1
    }
  },
  tooltip: {
    container: {
      background: 'white',
      color: '#333333',
      fontSize: '12px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '12px'
    }
  }
};

function ChartView({ data }) {
  const [chartType, setChartType] = useState('revenue');
  const [groupBy, setGroupBy] = useState('track');

  const prepareBarData = () => {
    let sourceData;

    if (groupBy === 'track') {
      sourceData = data.trackSummary.slice(0, 10).map(item => ({
        id: item.Track,
        TotalRevenue: parseFloat(item.TotalRevenue.split(' ')[0]),
        ArtistRevenue: parseFloat(item.ArtistRevenue.split(' ')[0])
      }));
    } else if (groupBy === 'artist') {
      sourceData = data.artistSummary.map(item => ({
        id: item.Artist,
        TotalRevenue: parseFloat(item.TotalRevenue.split(' ')[0]),
        ArtistRevenue: parseFloat(item.ArtistRevenue.split(' ')[0])
      }));
    } else {
      sourceData = data.periodSummary.map(item => ({
        id: item.Period,
        TotalRevenue: parseFloat(item.TotalRevenue.split(' ')[0]),
        ArtistRevenue: parseFloat(item.ArtistRevenue.split(' ')[0])
      }));
    }

    return sourceData.sort((a, b) => b.TotalRevenue - a.TotalRevenue);
  };

  const prepareLineData = () => {
    const periodData = data.periodSummary.map(item => ({
      x: item.Period,
      y: parseFloat(item.TotalRevenue.split(' ')[0])
    })).sort((a, b) => a.x.localeCompare(b.x));

    return [
      {
        id: 'Total Revenue',
        data: periodData
      }
    ];
  };

  const preparePieData = () => {
    return data.artistSummary.map(item => ({
      id: item.Artist,
      label: item.Artist,
      value: parseFloat(item.TotalRevenue.split(' ')[0])
    }));
  };

  const renderChart = () => {
    switch (chartType) {
      case 'revenue':
        return (
          <div className="h-[500px]">
            <ResponsiveBar
              data={prepareBarData()}
              keys={['TotalRevenue', 'ArtistRevenue']}
              indexBy="id"
              margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'nivo' }}
              theme={chartTheme}
              defs={[
                {
                  id: 'dots',
                  type: 'patternDots',
                  background: 'inherit',
                  color: '#38bdf8',
                  size: 4,
                  padding: 1,
                  stagger: true
                },
                {
                  id: 'lines',
                  type: 'patternLines',
                  background: 'inherit',
                  color: '#38bdf8',
                  rotation: -45,
                  lineWidth: 6,
                  spacing: 10
                }
              ]}
              borderColor={{
                from: 'color',
                modifiers: [['darker', 1.6]]
              }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: groupBy === 'period' ? 'Period' : groupBy === 'artist' ? 'Artist' : 'Track',
                legendPosition: 'middle',
                legendOffset: 40
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Revenue',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{
                from: 'color',
                modifiers: [['darker', 1.6]]
              }}
              legends={[
                {
                  dataFrom: 'keys',
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
              role="application"
              ariaLabel="Revenue chart"
            />
          </div>
        );
      case 'trend':
        return (
          <div className="h-[500px]">
            <ResponsiveLine
              data={prepareLineData()}
              margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
              xScale={{ type: 'point' }}
              yScale={{
                type: 'linear',
                min: 'auto',
                max: 'auto',
                stacked: false,
                reverse: false
              }}
              theme={chartTheme}
              yFormat=" >-.2f"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Period',
                legendOffset: 40,
                legendPosition: 'middle'
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Revenue',
                legendOffset: -40,
                legendPosition: 'middle'
              }}
              pointSize={10}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              pointLabelYOffset={-12}
              useMesh={true}
              legends={[
                {
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 100,
                  translateY: 0,
                  itemsSpacing: 0,
                  itemDirection: 'left-to-right',
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: 'circle',
                  symbolBorderColor: 'rgba(0, 0, 0, .5)',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemBackground: 'rgba(0, 0, 0, .03)',
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
            />
          </div>
        );
      case 'distribution':
        return (
          <div className="h-[500px]">
            <ResponsivePie
              data={preparePieData()}
              margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              borderWidth={1}
              borderColor={{
                from: 'color',
                modifiers: [['darker', 0.2]]
              }}
              theme={chartTheme}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{
                from: 'color',
                modifiers: [['darker', 2]]
              }}
              defs={[
                {
                  id: 'dots',
                  type: 'patternDots',
                  background: 'inherit',
                  color: 'rgba(255, 255, 255, 0.3)',
                  size: 4,
                  padding: 1,
                  stagger: true
                },
                {
                  id: 'lines',
                  type: 'patternLines',
                  background: 'inherit',
                  color: 'rgba(255, 255, 255, 0.3)',
                  rotation: -45,
                  lineWidth: 6,
                  spacing: 10
                }
              ]}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 56,
                  itemsSpacing: 0,
                  itemWidth: 100,
                  itemHeight: 18,
                  itemTextColor: '#999',
                  itemDirection: 'left-to-right',
                  itemOpacity: 1,
                  symbolSize: 18,
                  symbolShape: 'circle',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemTextColor: '#000'
                      }
                    }
                  ]
                }
              ]}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-primary-900/20 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ${selected
                ? 'bg-white text-primary-700 shadow'
                : 'text-gray-600 hover:bg-white/[0.12] hover:text-primary-600'
              }`
            }
            onClick={() => setChartType('revenue')}
          >
            Revenue Comparison
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ${selected
                ? 'bg-white text-primary-700 shadow'
                : 'text-gray-600 hover:bg-white/[0.12] hover:text-primary-600'
              }`
            }
            onClick={() => setChartType('trend')}
          >
            Revenue Trend
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5
              ${selected
                ? 'bg-white text-primary-700 shadow'
                : 'text-gray-600 hover:bg-white/[0.12] hover:text-primary-600'
              }`
            }
            onClick={() => setChartType('distribution')}
          >
            Revenue Distribution
          </Tab>
        </Tab.List>
      </Tab.Group>

      {chartType === 'revenue' && (
        <div className="flex justify-end space-x-4">
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="track">By Track</option>
            <option value="artist">By Artist</option>
            <option value="period">By Period</option>
          </select>
        </div>
      )}

      <motion.div
        key={chartType + groupBy}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl bg-white p-4 shadow-lg"
      >
        {renderChart()}
      </motion.div>
    </div>
  );
}

export default ChartView; 