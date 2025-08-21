'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MetricsPanel, useMetricsControl } from '@/modules/metrics';
import React from 'react';

// Example custom control component
function RegionControl() {
  const { value, setValue } = useMetricsControl<string>('region');

  return (
    <div className="space-y-2">
      <Label>Region</Label>
      <Select value={value || ''} onValueChange={setValue}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select region..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="us-east-1">US East 1</SelectItem>
          <SelectItem value="us-west-2">US West 2</SelectItem>
          <SelectItem value="eu-west-1">EU West 1</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// Example custom control for service selection
function ServiceControl() {
  const { value, setValue } = useMetricsControl<string>('service');

  return (
    <div className="space-y-2">
      <Label>Service</Label>
      <Select value={value || ''} onValueChange={setValue}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select service..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="api">API Service</SelectItem>
          <SelectItem value="web">Web Service</SelectItem>
          <SelectItem value="worker">Worker Service</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

// Example preset buttons
function PresetControls() {
  const { setValue: setRegion } = useMetricsControl<string>('region');
  const { setValue: setService } = useMetricsControl<string>('service');

  const applyProductionPreset = () => {
    setRegion('us-east-1');
    setService('api');
  };

  const applyStagingPreset = () => {
    setRegion('us-west-2');
    setService('web');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={applyProductionPreset}>
        Production
      </Button>
      <Button variant="outline" size="sm" onClick={applyStagingPreset}>
        Staging
      </Button>
    </div>
  );
}

/**
 * Complete example showing MetricsPanel usage with custom controls
 */
export function MetricsPanelExample() {
  const handleFiltersChange = (filters: any) => {
    console.log('Filters changed:', filters);
    // Here you would typically make API calls with the filter values
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">MetricsPanel Example</h1>
        <p className="text-muted-foreground">
          Demonstrating the new MetricsPanel with custom controls and auto-integrated charts
        </p>
      </div>

      {/* Example 1: Simple Usage */}
      <MetricsPanel onFiltersChange={handleFiltersChange}>
        <MetricsPanel.Section
          title="Simple Example"
          description="Basic controls with default layout">
          <MetricsPanel.Controls>
            <MetricsPanel.TimeRange />
            <MetricsPanel.Step />
            <MetricsPanel.Refresh />
          </MetricsPanel.Controls>

          <MetricsPanel.Grid cols={2}>
            <MetricsPanel.Chart
              query="rate(cpu_usage_total[5m])"
              title="CPU Usage Rate"
              description="CPU usage rate over time"
            />
            <MetricsPanel.Card
              query="avg(memory_usage_percent)"
              title="Average Memory Usage"
              metricFormat="percent"
            />
          </MetricsPanel.Grid>
        </MetricsPanel.Section>

        {/* Example 2: Custom Controls */}
        <MetricsPanel.Section title="Custom Controls" description="With region and service filters">
          <MetricsPanel.Controls variant="card" showHeader>
            <MetricsPanel.TimeRange />
            <MetricsPanel.Step />
            <RegionControl />
            <ServiceControl />
            <PresetControls />
          </MetricsPanel.Controls>

          <MetricsPanel.Grid cols={3}>
            <MetricsPanel.Chart
              query={(filters) => {
                const regionFilter = filters.region ? `region="${filters.region}"` : '';
                const serviceFilter = filters.service ? `service="${filters.service}"` : '';
                const labels = [regionFilter, serviceFilter].filter(Boolean).join(',');
                return `cpu_usage{${labels}}`;
              }}
              title="CPU Usage by Region & Service"
              chartType="area"
            />
            <MetricsPanel.Chart
              query={(filters) => {
                const regionFilter = filters.region ? `region="${filters.region}"` : '';
                return `memory_usage{${regionFilter}}`;
              }}
              title="Memory Usage"
              chartType="line"
            />
            <MetricsPanel.Card
              query={(filters) => {
                const serviceFilter = filters.service ? `service="${filters.service}"` : '';
                return `http_requests_total{${serviceFilter}}`;
              }}
              title="Total Requests"
              metricFormat="number"
            />
          </MetricsPanel.Grid>
        </MetricsPanel.Section>

        {/* Example 3: Collapsible Controls */}
        <MetricsPanel.Section title="Collapsible Controls" description="Space-saving layout">
          <MetricsPanel.Controls variant="card" showHeader collapsible defaultExpanded={false}>
            <MetricsPanel.TimeRange />
            <MetricsPanel.Step />
            <MetricsPanel.Refresh />
            <RegionControl />
          </MetricsPanel.Controls>

          <MetricsPanel.Chart
            query="rate(http_requests_total[5m])"
            title="HTTP Request Rate"
            height={200}
          />
        </MetricsPanel.Section>
      </MetricsPanel>
    </div>
  );
}

/**
 * Minimal example for quick testing
 */
export function MinimalExample() {
  return (
    <MetricsPanel>
      <MetricsPanel.Controls>
        <MetricsPanel.TimeRange />
        <MetricsPanel.Step />
      </MetricsPanel.Controls>

      <MetricsPanel.Chart query="up" title="Service Uptime" />
    </MetricsPanel>
  );
}
