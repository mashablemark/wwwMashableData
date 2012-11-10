/**
* 	Created by Shivan Computers Corporation on behalf of the
* 	U.S. Energy Information Administration:
*	Author : Ryan Lynch (Ryan.Lynch@eia.gov)
*	
*	EIA Analyis Module:
*
*	This module extend the EIA Theme to add various analytical
*	functions to the chart, along with a set of controls to 
*	activate them.
*
*	Depends on: highcharts.js, eia-theme.js
**/

(function(){
	
	// Shortcuts
	var HC = Highcharts,
	Chart = HC.Chart;
	each = HC.each,
	extend = HC.extend,
	map = HC.map,
	eiaTheme = HC.eiaTheme,
	seasonalPalletAlpha = 0.3;
	
	// Default Analysis Options
	HC.setOptions(extend(eiaTheme, {
		analysis: {
			enableMovingAverage:true,
			enableSeasonalAnalysis:true
		}
	}));
	
	function seasonalPalletConverter(h){
		return 'rgba(' + 
			parseInt(h.substring(1,3), 16) + ',' +
			parseInt(h.substring(3,5), 16) + ',' + 
			parseInt(h.substring(5), 16) + ',' +
			seasonalPalletAlpha + ')';
	}
	
	// Colors for seasonal analysis
	extend(HC, {
		eia_seasonal_pallet : map(eiaTheme.colors.slice(1), seasonalPalletConverter)
	});
	
	//////////////////////////
	// Analytical Functions //
	//////////////////////////
	
	extend(Chart.prototype,{
	
		addMovingAverage : function(index, duration){
			var chart = this, baseSeries = chart.series[index],
			interval = baseSeries.options.xType, baseData = baseSeries.data, 
			avgData = [], helperArray = [], dayInterval, durationTitle, 
			avg = total = i = j = calcDuration = 0;
			// If we are dealing with a series that has been destroyed, then
			// return
			if(!baseData) return;
			// else
			switch(interval){
				case HC.xTypes.Annual:
				case HC.xTypes.Quarterly:
				case HC.xTypes.Monthly:
					return;
					break;
				case HC.xTypes.weekly:
					durationTitle = duration + ' Week';
					dayInterval = 7 * 24 * 60 * 60 * 1000;
					break;
				case HC.xTypes.daily:
					durationTitle = duration + ' Day';
					dayInterval = 1 * 24 * 60 * 60 * 1000;
					break;
			}

			for(i = duration; helperArray.length == 0; i++){
				for(j = i - duration; j < i; j++){
					if(
						baseData[j].y != null && 
						baseData[j].x >= baseData[i].x - dayInterval * duration
					){
						total += baseData[j].y;
						helperArray.push(baseData[j]);
					}
				}
			}
			
			avgData.push([baseData[i].x, total/helperArray.length]);
			
			for(i = duration + 1; i < baseData.length; i++){
				if(
					helperArray[0].x <= baseData[i].x - dayInterval * duration
				){
					total -= helperArray[0].y;
					helperArray.shift();
				}
				
				j = i - 1
				
				if(
					baseData[j].y != null && 
					baseData[j].x >= baseData[i].x - dayInterval * duration
				){
					total += baseData[j].y;
					helperArray.push(baseData[j]);
				}
				
				avgData.push([baseData[i].x, total / helperArray.length]);
			}
			
			return chart.addSeries({
				name : baseSeries.name + durationTitle + ' Moving Average',
				data : avgData
			});
		},
		
		createSeasonalAnalysis : function(index, interval){
			var chart = this, baseSeries = chart.series[index], yearOffset,  
			baseData = baseSeries.data, i = j = 0, series = [], seriesData,
			xType = baseSeries.options.xType,  serie, startDate, currentDate, 
			firstDate, lastDate, dateString;
			
			if(!baseData) return;
			j = baseData.length - 1;
			startDate = new Date(baseData[j].x);
			for(i = 0; i <= interval && j > 0; i++){
				endDate = new Date(
					startDate.getUTCFullYear() - 1, 
					startDate.getUTCMonth(), 
					startDate.getUTCDate()
				)
				seriesData = [];
				lastDate = new Date(baseData[j].x);
				while(
					j >= 0 && 
					(!currentDate || currentDate.getTime() >= endDate.getTime())
				){
					currentDate = new Date(baseData[j].x);
					seriesData.push({
						x: Date.UTC(
							currentDate.getUTCFullYear() + i,
							currentDate.getUTCMonth(),
							currentDate.getUTCDate()), 
						y: baseData[j].y
					});
					firstDate = currentDate;
					j--;
				}
				j++;
				switch(xType){
					case HC.xTypes.daily:
						dateString = HC.dateFormat('%m/%d/%Y', firstDate.getTime()) + 
						' to ' + HC.dateFormat('%m/%d/%Y', lastDate.getTime());
						break;
					case HC.xTypes.weekly:
						dateString ='W/O ' + HC.dateFormat('%m/%d/%Y', firstDate.getTime()) + 
						' to W/O ' + HC.dateFormat('%m/%d/%Y', lastDate.getTime());
						break;
					case HC.xTypes.monthly:
						dateString = HC.dateFormat('%m/%Y', firstDate.getTime()) + ' to ' + 
						HC.dateFormat('%m/%Y', lastDate.getTime());
						break;
				}
				serie = {
					name:baseSeries.options.name + ' ' + dateString,
					data:seriesData,
					legendIndex:i
				};
				if(i > 0) serie.color = HC.eia_seasonal_pallet[i-1];
				series.push(serie);
				startDate = endDate;
			}
			
			chart.removeAllSeries(false);
			
			for(j=series.length - 1; j>=0; j--){
				chart.addSeries(series[j], false);
			}
			
			chart.resetZoom();
			chart.redraw();
		}
	});
	
	function createSeasonalAnalysisOptions(s, index){
		var chart = this, xType = s.options.xType;
		if(s.type == 'line' && xType != HC.xTypes.category){
			var link, durations, maxInterval;
			if(xType > HC.xTypes.annual){
				maxInterval = (s.data[s.data.length - 1].x - s.data[0].x) / 31536E6 /*365 days*/;
				// Add moving averages
				each([5, 10], function(interval){
					if(interval < maxInterval){
						option = $('<option></option>').html(s.name + ': ' + interval + ' Year Seasonal Analysis')
						.data({
							method:chart.createSeasonalAnalysis,
							arguments:[index, interval]
						});
						option.appendTo(chart.options.chart.analysisSelect);
					}
				});
			}
		}
	}
	
	function createMovingAverageOptions(s, index){
		var chart = this, xType = s.options.xType;
		if(s.type == 'line' && xType != HC.xTypes.category){
			var link, durations,
			maxDuration = s.data.length;
			if(xType == HC.xTypes.daily){
				// Add moving averages
				each([30, 60, 90], function(duration){
					if(duration < maxDuration){
						option = $('<option></option>').html(s.name + ': ' + duration + ' Day Moving Average ')
						.data({
							method:chart.addMovingAverage,
							arguments:[index, duration]
						});
						option.appendTo(chart.options.chart.analysisSelect);
					}
				});
			}
			if(xType == HC.xTypes.weekly){
				each([4, 8, 12], function(duration){
					if(duration < maxDuration){
						option = $('<option></option>').html(s.name + ': ' + duration + ' Week Moving Average ')
						.data({
							method:chart.addMovingAverage,
							arguments:[index, duration]
						});
						option.appendTo(chart.options.chart.analysisSelect);
					}
				});
			}	
		}
	}
	
	function processAnalysis(){
		var chart = this, ops = chart.options,
		container = $(chart.options.chart.container),
		outerContainer = $(chart.options.chart.outerContainer);
		analysisContainer = $('<fieldset></fieldset>').css({
			height:'auto', 
			width:'auto', 
			// We set the margin and padding on the
			// captions container to match the chart
			// container so that the links are
			// lined up correctly
			marginLeft:container.css('marginLeft'),
			marginRight:container.css('marginRight')
			/*paddingLeft:container.css('paddingLeft'),
			paddingRight:container.css('paddingRight')*/
		}).addClass('chartAnalysisContainer').append('<legend>Chart Tools</legend>'),
		analysisSelect = $('<select></select>'),
		analysisTable = $('<table></table>');
		
		// Enable or disable analysis based on maxXType
		switch(ops.maxXType){
			case HC.xTypes.annual:
				ops.analysis.enableMovingAverage &= false;
				ops.analysis.enableSeasonalAnalysis &= false;
				break;
			case HC.xTypes.monthly:
				ops.analysis.enableMovingAverage &= false;
				ops.analysis.enableSeasonalAnalysis &= true;
				break;
			case HC.xTypes.weekly:
				ops.analysis.enableMovingAverage &= true;
				ops.analysis.enableSeasonalAnalysis &= true;
				break;
			case HC.xTypes.daily:
				ops.analysis.enableMovingAverage &= true;
				ops.analysis.enableSeasonalAnalysis &= true;
				break;
			default:
				ops.analysis.enableMovingAverage &= false;
				ops.analysis.enableSeasonalAnalysis &= false;
				break;
		}
		
		if((
			ops.analysis.enableMovingAverage || 
			ops.analysis.enableSeasonalAnalysis
			) && !ops.chart.analysisContainer){
			analysisContainer.appendTo(outerContainer);
			analysisTable.append(
				$('<tr></tr>').append(
					$('<td></td>').append(analysisSelect)
				)
			).appendTo(analysisContainer);
			ops.chart.analysisContainer = analysisContainer[0];
			ops.chart.analysisSelect = analysisSelect[0];
			// Create Analytical function links
			resetButton = $('<button></button>').html('Reset').click(function(){
				chart.resetSeries(true);
			});
			applyButton = $('<button></button>').html('Apply').click(function(){
				var select = chart.options.chart.analysisSelect, 
				option = select.options[select.selectedIndex],
				optionData = $(option).data();
				chart.resetSeries(false);
				optionData.method.apply(chart, optionData.arguments);
			});
			if(
				ops.analysis.enableMovingAverage || 
				ops.analysis.enableSeasonalAnalysis
			){
				for(i in chart.series){
					s = chart.series[i];
					if(ops.analysis.enableMovingAverage) createMovingAverageOptions.call(chart, s, i);
					if(ops.analysis.enableSeasonalAnalysis) createSeasonalAnalysisOptions.call(chart, s, i);
				}
				if(analysisSelect.children().length > 0){
					
					analysisTable.find('td')
						.append(applyButton)
						.append(resetButton);
					/*$('<tr></tr>').appendTo(analysisTable)
					.append(
						$('<td></td>')
						.append(applyButton)
						.append(resetButton)
					);*/
				}
				else
					analysisContainer.remove();
			}
		}
	}
	
	Chart.prototype.callbacks.push(processAnalysis);
}());