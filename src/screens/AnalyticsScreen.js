/**
 * Analytics Screen
 * Displays historical charts for Health, Battery, and Geofence data.
 * Uses react-native-chart-kit for professional visualizations.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { COLORS } from '../config/constants';
import { fetchFeedData } from '../services/adafruitService';
import { useTranslation } from '../i18n/LanguageContext';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;

const chartConfig = {
  backgroundGradientFrom: COLORS.surface,
  backgroundGradientTo: COLORS.surface,
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 1,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
};

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState('24h');

  // Aggregated Data for Charts
  const [tempData, setTempData] = useState(null);
  const [bpmData, setBpmData] = useState(null);
  const [batteryData, setBatteryData] = useState(null);
  const [humidityData, setHumidityData] = useState(null);
  const [geofenceData, setGeofenceData] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedRange]);

  const loadData = async () => {
    const limit = selectedRange === '24h' ? 100 : selectedRange === '7d' ? 500 : 1000;
    
    setLoading(true);
    try {
      const [bat, temp, bpm, hum, geo] = await Promise.all([
        fetchFeedData('battery', limit),
        fetchFeedData('temperature', limit),
        fetchFeedData('bpm', limit),
        fetchFeedData('humidity', limit),
        fetchFeedData('geofence', limit),
      ]);

      processData(bat, temp, bpm, hum, geo);
    } catch (e) {
      console.error('[Analytics] Load error:', e);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const processData = (bat, temp, bpm, hum, geo) => {
    setTempData(aggregateData(temp, 'avg'));
    setBpmData(aggregateData(bpm, 'avg'));
    setBatteryData(aggregateData(bat, 'avg'));
    setHumidityData(aggregateData(hum, 'avg'));
    setGeofenceData(aggregateGeofence(geo));
  };

  /**
   * Aggregates linear data (Temp, BPM, Battery)
   */
  const aggregateData = (data, type = 'avg') => {
    if (!data || data.length === 0) return null;

    const grouped = {};
    const now = new Date();

    // Filter and Group
    data.forEach(item => {
      const val = parseFloat(item.value);
      if (isNaN(val)) return; // Skip NaNs

      const date = new Date(item.created_at);
      let key;

      if (selectedRange === '24h') {
        const diffHours = (now - date) / (1000 * 60 * 60);
        if (diffHours > 24) return;
        key = date.getHours(); 
      } else {
        const diffDays = (now - date) / (1000 * 60 * 60 * 24);
        const maxDays = selectedRange === '7d' ? 7 : 30;
        if (diffDays > maxDays) return;
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        key = selectedRange === '7d' ? days[date.getDay()] : `${date.getDate()}/${date.getMonth() + 1}`;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(val);
    });

    // Calculate Averages
    const labels = [];
    const values = [];

    // Sort keys logically if possible, otherwise use insertion order (usually newest first from API, so reverse)
    const keys = Object.keys(grouped).reverse(); 

    keys.forEach(key => {
      const vals = grouped[key];
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      
      labels.push(key.toString());
      values.push(avg);
    });

    if (labels.length === 0) return null;

    // Limit labels to prevent overcrowding
    const finalLabels = labels.length > 7 ? labels.map((l, i) => i % Math.ceil(labels.length/7) === 0 ? l : '') : labels;

    return {
      labels: finalLabels,
      datasets: [{ data: values }]
    };
  };

  /**
   * Aggregates Geofence data for Pie Chart
   */
  const aggregateGeofence = (data) => {
    if (!data || data.length === 0) return [];

    let insideCount = 0;
    let outsideCount = 0;
    const now = new Date();
    const maxTime = selectedRange === '24h' ? 24 * 60 * 60 * 1000 : 
                    selectedRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 
                    30 * 24 * 60 * 60 * 1000;

    data.forEach(item => {
       const date = new Date(item.created_at);
       if ((now - date) > maxTime) return;

       if (item.value.toLowerCase().includes('inside')) insideCount++;
       else if (item.value.toLowerCase().includes('outside')) outsideCount++;
    });

    if (insideCount === 0 && outsideCount === 0) return [];

    return [
      {
        name: 'Safe (Inside)',
        population: insideCount,
        color: COLORS.safe,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Alert (Outside)',
        population: outsideCount,
        color: COLORS.danger,
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
    ];
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      {/* Time Range Selector */}
      <View style={styles.rangeSelector}>
        {[
          { key: '24h', label: t('analytics.last24h') },
          { key: '7d',  label: t('analytics.last7d') },
          { key: '30d', label: t('analytics.last30d') },
        ].map((range) => (
          <TouchableOpacity
            key={range.key}
            style={[styles.rangeButton, selectedRange === range.key && styles.rangeButtonActive]}
            onPress={() => setSelectedRange(range.key)}
          >
            <Text style={[styles.rangeText, selectedRange === range.key && styles.rangeTextActive]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing && (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      )}

      {!loading && (
        <View style={styles.content}>
            
            {/* Geofence Pie Chart */}
             <View style={styles.card}>
                <Text style={styles.chartTitle}>{t('analytics.geofenceStatus')}</Text>
                {geofenceData.length > 0 ? (
                  <PieChart
                    data={geofenceData}
                    width={CHART_WIDTH}
                    height={200}
                    chartConfig={chartConfig}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[0, 0]}
                    absolute
                  />
                ) : (
                  <Text style={styles.noData}>{t('common.noData')}</Text>
                )}
            </View>

            {/* Temperature Line Chart */}
            <View style={styles.card}>
                <Text style={styles.chartTitle}>{t('analytics.temperatureTrend')} (°C)</Text>
                {tempData ? (
                   <LineChart
                    data={tempData}
                    width={CHART_WIDTH - 32}
                    height={220}
                    chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(255, 99, 71, ${opacity})` }}
                    bezier
                    style={styles.chart}
                  />
                ) : (
                   <Text style={styles.noData}>{t('common.noData')}</Text>
                )}
            </View>

             {/* BPM Line Chart */}
             <View style={styles.card}>
                <Text style={styles.chartTitle}>{t('analytics.heartRateTrend')} (BPM)</Text>
                {bpmData ? (
                   <LineChart
                    data={bpmData}
                    width={CHART_WIDTH - 32}
                    height={220}
                    chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})` }}
                    bezier
                    style={styles.chart}
                  />
                ) : (
                   <Text style={styles.noData}>{t('common.noData')}</Text>
                )}
            </View>

            {/* Battery Bar Chart */}
            <View style={styles.card}>
                <Text style={styles.chartTitle}>{t('analytics.batteryLevel')} (%)</Text>
                {batteryData ? (
                   <BarChart
                    data={batteryData}
                    width={CHART_WIDTH - 32}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix="%"
                    chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})` }}
                    style={styles.chart}
                  />
                ) : (
                   <Text style={styles.noData}>{t('common.noData')}</Text>
                )}
            </View>

             {/* Humidity Line Chart */}
             <View style={styles.card}>
                <Text style={styles.chartTitle}>{t('dashboard.humidity')} (%)</Text>
                {humidityData ? (
                   <LineChart
                    data={humidityData}
                    width={CHART_WIDTH - 32}
                    height={220}
                    chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(2, 136, 209, ${opacity})` }}
                    bezier
                    style={styles.chart}
                  />
                ) : (
                   <Text style={styles.noData}>{t('common.noData')}</Text>
                )}
            </View>

        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  rangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.surface,
    elevation: 2,
  },
  rangeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  rangeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  rangeText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  rangeTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noData: {
    padding: 20,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
});
