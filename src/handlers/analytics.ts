import { ToolResponse, ToolArgs } from '../types/shared';
import { readFileContent } from '../utils/file-utils';

export class AnalyticsHandler {
  async statisticalAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, column, sheet } = args;
    const data = await readFileContent(filePath, sheet);

    if (data.length <= 1) {
      throw new Error('File has no data rows');
    }

    const colIndex = isNaN(Number(column))
      ? data[0].indexOf(column)
      : Number(column);

    if (colIndex === -1 || colIndex >= (data[0]?.length || 0)) {
      throw new Error(`Column "${column}" not found`);
    }

    const values = [];
    for (let i = 1; i < data.length; i++) {
      const val = Number(data[i][colIndex]);
      if (!isNaN(val)) {
        values.push(val);
      }
    }

    if (values.length === 0) {
      throw new Error('No numeric values found in column');
    }

    // Calculate statistics
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Sort for median and quartiles
    const sorted = [...values].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Mode calculation
    const frequency: Record<number, number> = {};
    values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const modes = Object.keys(frequency).filter(val => frequency[+val] === maxFreq).map(Number);

    // Variance and standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    // Quartiles
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    // Skewness (simplified Pearson's method)
    const skewness = stdDev !== 0 ? 3 * (mean - median) / stdDev : 0;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            column: data[0][colIndex],
            statistics: {
              count: n,
              sum,
              mean: Math.round(mean * 10000) / 10000,
              median,
              mode: modes.length === 1 ? modes[0] : modes,
              min: Math.min(...values),
              max: Math.max(...values),
              range: Math.max(...values) - Math.min(...values),
              variance: Math.round(variance * 10000) / 10000,
              standardDeviation: Math.round(stdDev * 10000) / 10000,
              quartiles: {
                q1,
                q2: median,
                q3,
                iqr
              },
              skewness: Math.round(skewness * 10000) / 10000,
              coefficientOfVariation: mean !== 0 ? Math.round((stdDev / mean) * 100 * 100) / 100 : null
            }
          }, null, 2),
        },
      ],
    };
  }

  async correlationAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, column1, column2, sheet } = args;
    const data = await readFileContent(filePath, sheet);

    if (data.length <= 1) {
      throw new Error('File has no data rows');
    }

    const col1Index = isNaN(Number(column1)) ? data[0].indexOf(column1) : Number(column1);
    const col2Index = isNaN(Number(column2)) ? data[0].indexOf(column2) : Number(column2);

    if (col1Index === -1 || col2Index === -1) {
      throw new Error('One or both columns not found');
    }

    const pairs = [];
    for (let i = 1; i < data.length; i++) {
      const val1 = Number(data[i][col1Index]);
      const val2 = Number(data[i][col2Index]);
      if (!isNaN(val1) && !isNaN(val2)) {
        pairs.push([val1, val2]);
      }
    }

    if (pairs.length < 2) {
      throw new Error('Not enough valid numeric pairs for correlation analysis');
    }

    // Calculate Pearson correlation coefficient
    const n = pairs.length;
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    const correlation = denominator === 0 ? 0 : numerator / denominator;

    // Interpret correlation strength
    const absCorr = Math.abs(correlation);
    let strength = 'No correlation';
    if (absCorr >= 0.9) strength = 'Very strong';
    else if (absCorr >= 0.7) strength = 'Strong';
    else if (absCorr >= 0.5) strength = 'Moderate';
    else if (absCorr >= 0.3) strength = 'Weak';
    else if (absCorr >= 0.1) strength = 'Very weak';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            column1: data[0][col1Index],
            column2: data[0][col2Index],
            correlation: Math.round(correlation * 10000) / 10000, // Simplified for test compatibility
            correlationDetails: {
              coefficient: Math.round(correlation * 10000) / 10000,
              strength,
              direction: correlation > 0 ? 'Positive' : correlation < 0 ? 'Negative' : 'None',
              validPairs: n,
              interpretation: `${strength} ${correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : ''} correlation`
            }
          }, null, 2),
        },
      ],
    };
  }

  async dataProfile(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet } = args;
    const data = await readFileContent(filePath, sheet);

    if (data.length === 0) {
      throw new Error('File is empty');
    }

    const headers = data[0];
    const profile: Record<string, any> = {
      overview: {
        totalRows: data.length - 1,
        totalColumns: headers.length,
        fileName: filePath.split('/').pop() || filePath
      },
      columns: {}
    };

    // Analyze each column
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const columnName = headers[colIdx];
      const values = data.slice(1).map(row => row[colIdx]);
      const nonEmptyValues = values.filter(val => val !== '' && val !== null && val !== undefined);

      // Detect data type
      const numericValues = nonEmptyValues.map(Number).filter(val => !isNaN(val));
      const isNumeric = numericValues.length > nonEmptyValues.length * 0.8;

      const columnProfile: Record<string, any> = {
        dataType: isNumeric ? 'Numeric' : 'Text',
        totalValues: values.length,
        nonEmptyValues: nonEmptyValues.length,
        emptyValues: values.length - nonEmptyValues.length,
        uniqueValues: new Set(nonEmptyValues).size,
        duplicateValues: nonEmptyValues.length - new Set(nonEmptyValues).size
      };

      if (isNumeric && numericValues.length > 0) {
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        columnProfile.statistics = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          mean: Math.round(mean * 100) / 100,
          median: numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)]
        };
      } else {
        // Text analysis
        const lengths = nonEmptyValues.map(val => String(val).length);
        if (lengths.length > 0) {
          columnProfile.textAnalysis = {
            minLength: Math.min(...lengths),
            maxLength: Math.max(...lengths),
            avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length * 100) / 100
          };
        }
      }

      profile.columns[columnName] = columnProfile;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, profile }, null, 2),
        },
      ],
    };
  }

  async pivotTable(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, groupBy, aggregateColumn, operation, sheet } = args;
    const data = await readFileContent(filePath, sheet);

    if (data.length <= 1) {
      throw new Error('File has no data rows');
    }

    const groupByIndex = isNaN(Number(groupBy)) ? data[0].indexOf(groupBy) : Number(groupBy);
    const aggIndex = isNaN(Number(aggregateColumn)) ? data[0].indexOf(aggregateColumn) : Number(aggregateColumn);

    if (groupByIndex === -1 || aggIndex === -1) {
      throw new Error('One or both columns not found');
    }

    // Group data
    const groups: Record<string, number[]> = {};
    for (let i = 1; i < data.length; i++) {
      const groupKey = String(data[i][groupByIndex]);
      const value = Number(data[i][aggIndex]);

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      if (!isNaN(value)) {
        groups[groupKey].push(value);
      }
    }

    // Calculate aggregations
    const results: Array<{ group: string, value: number, count: number }> = [];
    for (const [group, values] of Object.entries(groups)) {
      if (values.length === 0) continue;

      let result: number;
      switch (operation) {
        case 'sum':
          result = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'average':
          result = values.reduce((a: number, b: number) => a + b, 0) / values.length;
          break;
        case 'count':
          result = values.length;
          break;
        case 'min':
          result = Math.min(...values);
          break;
        case 'max':
          result = Math.max(...values);
          break;
        default:
          result = 0;
      }

      results.push({
        group,
        value: Math.round(result * 100) / 100,
        count: values.length
      });
    }

    // Sort by value descending
    results.sort((a, b) => b.value - a.value);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            pivotTable: {
              groupBy: data[0][groupByIndex],
              aggregateColumn: data[0][aggIndex],
              operation,
              totalGroups: results.length,
              results
            }
          }, null, 2),
        },
      ],
    };
  }
}