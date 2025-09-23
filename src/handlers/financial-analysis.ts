/**
 * Financial Analysis Handler - CFO-Level Financial Modeling
 * Builds on HyperFormula's 15+ financial functions for advanced analysis
 */

import { ToolResponse, ToolArgs } from '../types/shared';
import { readFileContent } from '../utils/file-utils';
import { hyperFormulaEngine } from '../formula/hyperformula-engine';
import { WorkbookContext } from '../formula/evaluator';

interface ScenarioData {
  name: string;
  assumptions: Record<string, number>;
  results: Record<string, number>;
}

interface FinancialModel {
  name: string;
  description: string;
  template: any;
  scenarios: ScenarioData[];
}

export class FinancialAnalysisHandler {

  // Pre-built financial models for common CFO tasks
  private financialTemplates: Record<string, FinancialModel> = {
    'dcf': {
      name: 'Discounted Cash Flow Model',
      description: 'Standard DCF valuation with multiple scenarios',
      template: {
        assumptions: {
          initialInvestment: -1000000,
          growthRate: 0.15,
          discountRate: 0.12,
          terminalMultiple: 8,
          projectionYears: 5
        },
        calculations: {
          cashFlows: '=FORECAST.LINEAR()',
          npv: '=NPV(discountRate, cashFlows) + initialInvestment',
          irr: '=IRR(cashFlows)',
          terminalValue: '=lastCashFlow * terminalMultiple',
          enterpriseValue: '=NPV + terminalValue'
        }
      },
      scenarios: []
    },

    'budget_variance': {
      name: 'Budget Variance Analysis',
      description: 'Compare actual vs budget with variance calculations',
      template: {
        categories: ['Revenue', 'COGS', 'Operating Expenses', 'CapEx'],
        calculations: {
          variance: '=actual - budget',
          variancePercent: '=variance / budget',
          favorable: '=IF(variance > 0, "Favorable", "Unfavorable")'
        }
      },
      scenarios: []
    },

    'ratio_analysis': {
      name: 'Financial Ratio Analysis',
      description: 'Comprehensive ratio analysis with industry benchmarks',
      template: {
        ratios: {
          currentRatio: '=currentAssets / currentLiabilities',
          quickRatio: '=(currentAssets - inventory) / currentLiabilities',
          debtToEquity: '=totalDebt / totalEquity',
          roe: '=netIncome / totalEquity',
          roa: '=netIncome / totalAssets',
          grossMargin: '=grossProfit / revenue',
          operatingMargin: '=operatingIncome / revenue'
        },
        benchmarks: {
          currentRatio: { min: 1.2, max: 2.0 },
          quickRatio: { min: 0.8, max: 1.5 },
          debtToEquity: { min: 0.3, max: 1.5 }
        }
      },
      scenarios: []
    }
  };

  async dcfAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet, assumptions = {} } = args;

    try {
      const data = await readFileContent(filePath, sheet);

      // Default DCF assumptions
      const dcfParams = {
        initialInvestment: assumptions.initialInvestment || -1000000,
        growthRate: assumptions.growthRate || 0.15,
        discountRate: assumptions.discountRate || 0.12,
        terminalMultiple: assumptions.terminalMultiple || 8,
        projectionYears: assumptions.projectionYears || 5,
        ...assumptions
      };

      // Generate cash flow projections
      const cashFlows = [];
      let revenue = assumptions.startingRevenue || 1000000;

      for (let year = 1; year <= dcfParams.projectionYears; year++) {
        revenue *= (1 + dcfParams.growthRate);
        const cashFlow = revenue * 0.2; // 20% margin simplified
        cashFlows.push(cashFlow);
      }

      // Calculate NPV
      const npvFormula = `NPV(${dcfParams.discountRate}, ${cashFlows.join(',')})`;
      const mockContext: WorkbookContext = {
        getCellValue: () => 0,
        getNamedRangeValue: () => 0,
        getRangeValues: () => [],
        getSheetCellValue: () => 0,
        getSheetRangeValues: () => []
      };
      const npv = hyperFormulaEngine.evaluateFormula(npvFormula, mockContext);

      // Terminal value
      const terminalValue = cashFlows[cashFlows.length - 1] * dcfParams.terminalMultiple;
      const enterpriseValue = (typeof npv === 'number' ? npv : 0) + terminalValue + Math.abs(dcfParams.initialInvestment);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            model: 'DCF Analysis',
            assumptions: dcfParams,
            projections: {
              cashFlows,
              npv,
              terminalValue,
              enterpriseValue
            },
            valuation: {
              enterpriseValue,
              equityValue: enterpriseValue, // Simplified
              valuePerShare: enterpriseValue / 1000000 // Simplified
            }
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'dcf_analysis'
          }, null, 2)
        }]
      };
    }
  }

  async budgetVarianceAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet, actualColumn, budgetColumn } = args;

    try {
      const data = await readFileContent(filePath, sheet);

      if (data.length <= 1) {
        throw new Error('File has no data rows');
      }

      const headers = data[0];
      const actualIdx = isNaN(Number(actualColumn)) ? headers.indexOf(actualColumn) : Number(actualColumn);
      const budgetIdx = isNaN(Number(budgetColumn)) ? headers.indexOf(budgetColumn) : Number(budgetColumn);

      if (actualIdx === -1 || budgetIdx === -1) {
        throw new Error('Actual or budget column not found');
      }

      const variances = [];
      let totalVariance = 0;

      for (let i = 1; i < data.length; i++) {
        const category = data[i][0] || `Row ${i}`;
        const actual = Number(data[i][actualIdx]) || 0;
        const budget = Number(data[i][budgetIdx]) || 0;

        const variance = actual - budget;
        const variancePercent = budget !== 0 ? (variance / budget) * 100 : 0;

        variances.push({
          category,
          actual,
          budget,
          variance,
          variancePercent: Math.round(variancePercent * 100) / 100,
          status: variance >= 0 ? 'Favorable' : 'Unfavorable'
        });

        totalVariance += variance;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            analysis: 'Budget Variance Analysis',
            summary: {
              totalVariance,
              categories: variances.length,
              favorableCount: variances.filter(v => v.variance >= 0).length,
              unfavorableCount: variances.filter(v => v.variance < 0).length
            },
            details: variances
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'budget_variance_analysis'
          }, null, 2)
        }]
      };
    }
  }

  async ratioAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet } = args;

    try {
      const data = await readFileContent(filePath, sheet);

      if (data.length < 2) {
        throw new Error('Insufficient data for ratio analysis');
      }

      // Extract financial data (assuming standard financial statement format)
      const headers = data[0];
      const values = data[1]; // Assuming single period

      const financials = {
        currentAssets: this.findValue(headers, values, ['current assets', 'currentAssets']),
        currentLiabilities: this.findValue(headers, values, ['current liabilities', 'currentLiabilities']),
        inventory: this.findValue(headers, values, ['inventory']),
        totalDebt: this.findValue(headers, values, ['total debt', 'totalDebt']),
        totalEquity: this.findValue(headers, values, ['total equity', 'totalEquity']),
        netIncome: this.findValue(headers, values, ['net income', 'netIncome']),
        totalAssets: this.findValue(headers, values, ['total assets', 'totalAssets']),
        grossProfit: this.findValue(headers, values, ['gross profit', 'grossProfit']),
        revenue: this.findValue(headers, values, ['revenue', 'sales']),
        operatingIncome: this.findValue(headers, values, ['operating income', 'operatingIncome'])
      };

      // Calculate ratios
      const ratios = {
        currentRatio: financials.currentAssets / financials.currentLiabilities,
        quickRatio: (financials.currentAssets - financials.inventory) / financials.currentLiabilities,
        debtToEquity: financials.totalDebt / financials.totalEquity,
        returnOnEquity: financials.netIncome / financials.totalEquity,
        returnOnAssets: financials.netIncome / financials.totalAssets,
        grossMargin: financials.grossProfit / financials.revenue,
        operatingMargin: financials.operatingIncome / financials.revenue
      };

      // Industry benchmarks
      const benchmarks = {
        currentRatio: { range: '1.2 - 2.0', status: this.evaluateBenchmark(ratios.currentRatio, 1.2, 2.0) },
        quickRatio: { range: '0.8 - 1.5', status: this.evaluateBenchmark(ratios.quickRatio, 0.8, 1.5) },
        debtToEquity: { range: '0.3 - 1.5', status: this.evaluateBenchmark(ratios.debtToEquity, 0.3, 1.5) }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            analysis: 'Financial Ratio Analysis',
            ratios: Object.fromEntries(
              Object.entries(ratios).map(([key, value]) => [key, Math.round(value * 100) / 100])
            ),
            benchmarks,
            interpretation: this.generateRatioInterpretation(ratios, benchmarks)
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'ratio_analysis'
          }, null, 2)
        }]
      };
    }
  }

  async scenarioModeling(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet, scenarios = [] } = args;

    try {
      const baseData = await readFileContent(filePath, sheet);

      const results = [];

      for (const scenario of scenarios) {
        const scenarioResults = {
          name: scenario.name,
          assumptions: scenario.assumptions || {},
          results: {}
        };

        // Apply scenario assumptions to calculate results
        // This is a simplified implementation - real scenario modeling would be more complex
        if (scenario.assumptions) {
          const modifiedData = this.applyScenarioAssumptions(baseData, scenario.assumptions);

          // Calculate key metrics for this scenario
          scenarioResults.results = this.calculateScenarioMetrics(modifiedData, scenario.assumptions);
        }

        results.push(scenarioResults);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            analysis: 'Scenario Modeling',
            scenariosAnalyzed: results.length,
            results
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'scenario_modeling'
          }, null, 2)
        }]
      };
    }
  }

  private findValue(headers: string[], values: any[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
      if (index !== -1) {
        return Number(values[index]) || 0;
      }
    }
    return 0;
  }

  private evaluateBenchmark(value: number, min: number, max: number): string {
    if (value < min) return 'Below Industry Average';
    if (value > max) return 'Above Industry Average';
    return 'Within Industry Range';
  }

  private generateRatioInterpretation(ratios: any, benchmarks: any): string {
    const concerns = [];
    const strengths = [];

    if (ratios.currentRatio < 1.2) concerns.push('Liquidity may be tight');
    if (ratios.debtToEquity > 1.5) concerns.push('High leverage');
    if (ratios.returnOnEquity > 0.15) strengths.push('Strong profitability');

    return `Analysis: ${strengths.concat(concerns).join(', ')}`;
  }

  private applyScenarioAssumptions(data: any[][], assumptions: Record<string, number>): any[][] {
    // Simplified scenario application - in reality this would be much more sophisticated
    return data.map(row => row.map(cell => {
      if (typeof cell === 'number' && assumptions[cell.toString()]) {
        return cell * (1 + assumptions[cell.toString()]);
      }
      return cell;
    }));
  }

  private calculateScenarioMetrics(data: any[][], assumptions: Record<string, number>): Record<string, number> {
    // Simplified metrics calculation
    return {
      totalRevenue: 1000000 * (1 + (assumptions.growthRate || 0)),
      totalExpenses: 700000 * (1 + (assumptions.costIncrease || 0)),
      netIncome: 300000 * (1 + (assumptions.marginChange || 0))
    };
  }

  async trendAnalysis(args: ToolArgs): Promise<ToolResponse> {
    const { filePath, sheet, dateColumn, valueColumn, periods = 12 } = args;

    try {
      const data = await readFileContent(filePath, sheet);

      if (data.length <= 1) {
        throw new Error('File has insufficient data rows for trend analysis');
      }

      const headers = data[0];
      const dateIdx = isNaN(Number(dateColumn)) ? headers.indexOf(dateColumn) : Number(dateColumn);
      const valueIdx = isNaN(Number(valueColumn)) ? headers.indexOf(valueColumn) : Number(valueColumn);

      if (dateIdx === -1 || valueIdx === -1) {
        throw new Error('Date or value column not found');
      }

      // Extract time series data (skip header row)
      const timeSeries: Array<{ date: string, value: number }> = [];

      for (let i = 1; i < data.length; i++) {
        const dateValue = data[i][dateIdx];
        const numericValue = Number(data[i][valueIdx]);

        if (dateValue && !isNaN(numericValue) && numericValue > 0) {
          timeSeries.push({
            date: String(dateValue),
            value: numericValue
          });
        }
      }

      if (timeSeries.length < 3) {
        throw new Error('Need at least 3 data points for trend analysis');
      }

      // Calculate trend metrics
      const values = timeSeries.map(d => d.value);
      const n = values.length;

      // Linear regression for trend line
      const trendMetrics = this.calculateLinearRegression(values);

      // Calculate growth rates
      const growthRates = [];
      for (let i = 1; i < values.length; i++) {
        const growth = (values[i] - values[i-1]) / values[i-1];
        growthRates.push(growth);
      }

      const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

      // Seasonal analysis (simplified quarterly)
      const seasonalAnalysis = this.analyzeSeasonality(values, periods);

      // Forecast next periods
      const forecast = this.generateForecast(values, periods, trendMetrics);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            analysis: 'Trend Analysis',
            dataPoints: n,
            timeRange: {
              start: timeSeries[0].date,
              end: timeSeries[n-1].date
            },
            trend: {
              slope: Math.round(trendMetrics.slope * 10000) / 10000,
              intercept: Math.round(trendMetrics.intercept * 10000) / 10000,
              rSquared: Math.round(trendMetrics.rSquared * 10000) / 10000,
              direction: trendMetrics.slope > 0 ? 'Increasing' : trendMetrics.slope < 0 ? 'Decreasing' : 'Flat',
              strength: Math.abs(trendMetrics.slope) > avgGrowthRate * 2 ? 'Strong' : Math.abs(trendMetrics.slope) > avgGrowthRate ? 'Moderate' : 'Weak'
            },
            growth: {
              averageGrowthRate: Math.round(avgGrowthRate * 10000) / 100,
              volatility: Math.round(this.calculateVolatility(growthRates) * 10000) / 100,
              maxGrowth: Math.round(Math.max(...growthRates) * 10000) / 100,
              minGrowth: Math.round(Math.min(...growthRates) * 10000) / 100
            },
            seasonality: seasonalAnalysis,
            forecast: forecast.slice(0, periods).map((value, index) => ({
              period: index + 1,
              predictedValue: Math.round(value * 100) / 100,
              confidence: index < 3 ? 'High' : index < 6 ? 'Medium' : 'Low'
            })),
            insights: this.generateTrendInsights(trendMetrics, avgGrowthRate, seasonalAnalysis)
          }, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'trend_analysis'
          }, null, 2)
        }]
      };
    }
  }

  private calculateLinearRegression(values: number[]): { slope: number, intercept: number, rSquared: number } {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of 0 to n-1
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares 0 to n-1
    const sumYY = values.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = values.reduce((sum, val, index) => {
      const predicted = slope * index + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { slope, intercept, rSquared: isNaN(rSquared) ? 0 : rSquared };
  }

  private calculateVolatility(growthRates: number[]): number {
    const mean = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / growthRates.length;
    return Math.sqrt(variance);
  }

  private analyzeSeasonality(values: number[], periods: number): any {
    // Simplified seasonality analysis
    const n = values.length;
    if (n < periods * 2) {
      return { detected: false, note: 'Insufficient data for seasonality analysis' };
    }

    // Calculate average by period (simplified)
    const periodAverages: Record<number, number[]> = {};

    for (let i = 0; i < n; i++) {
      const period = i % periods;
      if (!periodAverages[period]) periodAverages[period] = [];
      periodAverages[period].push(values[i]);
    }

    const seasonalIndices = Object.entries(periodAverages).map(([period, vals]) => ({
      period: parseInt(period),
      average: vals.reduce((sum, val) => sum + val, 0) / vals.length,
      count: vals.length
    }));

    const overallAverage = values.reduce((sum, val) => sum + val, 0) / n;
    const maxVariation = Math.max(...seasonalIndices.map(si => Math.abs(si.average - overallAverage))) / overallAverage;

    return {
      detected: maxVariation > 0.1, // 10% variation threshold
      strength: maxVariation > 0.2 ? 'Strong' : maxVariation > 0.1 ? 'Moderate' : 'Weak',
      periods: seasonalIndices,
      maxVariationPercent: Math.round(maxVariation * 10000) / 100
    };
  }

  private generateForecast(values: number[], periods: number, trend: any): number[] {
    const forecast = [];
    const n = values.length;

    for (let i = 0; i < periods; i++) {
      const predicted = trend.slope * (n + i) + trend.intercept;
      // Add some damping for long-term forecasts
      const dampingFactor = Math.max(0.3, 1 - (i * 0.1)); // Reduce growth over time
      forecast.push(predicted * dampingFactor);
    }

    return forecast;
  }

  private generateTrendInsights(trend: any, avgGrowth: number, seasonality: any): string[] {
    const insights = [];

    if (Math.abs(trend.slope) > Math.abs(avgGrowth)) {
      insights.push(`Strong ${trend.direction?.toLowerCase() || 'unknown'} trend detected (${trend.strength || 'unknown'} strength)`);
    } else {
      insights.push(`Trend is ${trend.direction?.toLowerCase() || 'unknown'} but relatively weak`);
    }

    if (trend.rSquared > 0.8) {
      insights.push('High confidence in trend prediction (R² > 0.8)');
    } else if (trend.rSquared > 0.5) {
      insights.push('Moderate confidence in trend prediction (R² > 0.5)');
    } else {
      insights.push('Low confidence in trend prediction - consider more data');
    }

    if (seasonality.detected) {
      insights.push(`${seasonality.strength} seasonal patterns detected (${seasonality.maxVariationPercent}% variation)`);
    }

    const volatility = this.calculateVolatility([avgGrowth]); // Simplified
    if (volatility > 0.2) {
      insights.push('High volatility detected - consider risk mitigation strategies');
    }

    return insights;
  }
}
