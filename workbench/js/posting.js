/** 
 * @license Highcharts JS v2.1.6 (2011-07-08)
 * Exporting module
 * 
 * (c) 2010-2011 Torstein Hønsi
 * 
 * License: www.highcharts.com/license
 */

// JSLint options:
/*global Highcharts, document, window, Math, setTimeout */
(function() { // encapsulate

// create shortcuts
var HC = Highcharts,
	Chart = HC.Chart,
	addEvent = HC.addEvent,
	createElement = HC.createElement,
	discardElement = HC.discardElement,
	css = HC.css,
	merge = HC.merge,
	each = HC.each,
	extend = HC.extend,
	math = Math,
	mathMax = math.max,
	doc = document,
	win = window,
	hasTouch = 'ontouchstart' in doc.documentElement,
	M = 'M',
	L = 'L',
	DIV = 'div',
	HIDDEN = 'hidden',
	NONE = 'none',
	PREFIX = 'highcharts-',
	ABSOLUTE = 'absolute',
	PX = 'px',
	UNDEFINED = undefined,

	// Add language and get the defaultOptions
	defaultOptions = HC.setOptions({
		lang: {
			downloadPNG: 'Download PNG image',
			downloadJPEG: 'Download JPEG image',
			downloadPDF: 'Download PDF document',
			downloadSVG: 'Download SVG vector image',
			exportButtonTitle: 'Export to raster or vector image',
			printButtonTitle: 'Print the chart',
			tools: 'Tools' //added mce
		}
	});
    extend(Chart.prototype, {
        getSVG: function() {
		var chart = this,
			chartCopy,
			sandbox,
			svg,
			seriesOptions,
			config,
			pointOptions,
			pointMarker,
			options = merge(chart.options); // copy the options and add extra options
		
		// IE compatibility hack for generating SVG content that it doesn't really understand
		if (!doc.createElementNS) {
			doc.createElementNS = function(ns, tagName) {
				var elem = doc.createElement(tagName);
				elem.getBBox = function() {
					return HC.Renderer.prototype.Element.prototype.getBBox.apply({ element: elem });
				};
				return elem;
			};
		}
		
		// create a sandbox where a new chart will be generated
		sandbox = createElement(DIV, null, {
			position: ABSOLUTE,
			top: '-9999em',
			width: chart.chartWidth + PX,
			height: chart.chartHeight + PX
		}, doc.body);
		
		// override some options
		extend(options.chart, {
			renderTo: sandbox,
			forExport: true
		});
		options.exporting.enabled = false; // hide buttons in print

		if (!options.exporting.enableImages) {
			options.chart.plotBackgroundImage = null; // the converter doesn't handle images
		}
		
		// prepare for replicating the chart
		options.series = [];
		each(chart.series, function(serie) {
			seriesOptions = serie.options;			
			
			seriesOptions.animation = false; // turn off animation
			seriesOptions.showCheckbox = false;
			seriesOptions.visible = serie.visible;
			
			if (!options.exporting.enableImages) {
				// remove image markers
				if (seriesOptions && seriesOptions.marker && /^url\(/.test(seriesOptions.marker.symbol)) { 
					seriesOptions.marker.symbol = 'circle';
				}
			}
			
			seriesOptions.data = [];
			
			each(serie.data, function(point) {
				
				// extend the options by those values that can be expressed in a number or array config
				config = point.config;
				pointOptions = {
					x: point.x,
					y: point.y,
					name: point.name
				};

				if (typeof config == 'object' && point.config && config.constructor != Array) {
					extend(pointOptions, config);
				}

				pointOptions.visible = point.visible;
				seriesOptions.data.push(pointOptions); // copy fresh updated data
								
				if (!options.exporting.enableImages) {
					// remove image markers
					pointMarker = point.config && point.config.marker;
					if (pointMarker && /^url\(/.test(pointMarker.symbol)) { 
						delete pointMarker.symbol;
					}
				}
			});	
			
			options.series.push(seriesOptions);
		});
		
		// generate the chart copy
		chartCopy = new Highcharts.Chart(options);		
		
		// reflect axis extremes in the export
		each(['xAxis', 'yAxis'], function(axisType) {
			each (chart[axisType], function(axis, i) {
				var axisCopy = chartCopy[axisType][i],
					extremes = axis.getExtremes(),
					userMin = extremes.userMin,
					userMax = extremes.userMax;
				
				if (userMin !== UNDEFINED || userMax !== UNDEFINED) {
					axisCopy.setExtremes(userMin, userMax, true, false);
				}
			});
		});
		
		// get the SVG from the container's innerHTML
		svg = chartCopy.container.innerHTML;
		
		// free up memory
		options = null;
		chartCopy.destroy();
		discardElement(sandbox);
		
		// sanitize
		svg = svg
			.replace(/zIndex="[^"]+"/g, '') 
			.replace(/isShadow="[^"]+"/g, '')
			.replace(/symbolName="[^"]+"/g, '')
			.replace(/jQuery[0-9]+="[^"]+"/g, '')
			.replace(/isTracker="[^"]+"/g, '')
			.replace(/url\([^#]+#/g, 'url(#')
			.replace(/<svg /, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ')
			.replace(/ href=/g, ' xlink:href=')
			/*.replace(/preserveAspectRatio="none">/g, 'preserveAspectRatio="none"/>')*/
			/* This fails in IE < 8
			.replace(/([0-9]+)\.([0-9]+)/g, function(s1, s2, s3) { // round off to save weight
				return s2 +'.'+ s3[0];
			})*/ 
			
			// IE specific
			.replace(/id=([^" >]+)/g, 'id="$1"') 
			.replace(/class=([^" ]+)/g, 'class="$1"')
			.replace(/ transform /g, ' ')
			.replace(/:(path|rect)/g, '$1')
			.replace(/<img ([^>]*)>/gi, '<image $1 />')
			.replace(/<\/image>/g, '') // remove closing tags for images as they'll never have any content
			.replace(/<image ([^>]*)([^\/])>/gi, '<image $1$2 />') // closes image tags for firefox
			.replace(/width=(\d+)/g, 'width="$1"')
			.replace(/height=(\d+)/g, 'height="$1"')
			.replace(/hc-svg-href="/g, 'xlink:href="')
			.replace(/style="([^"]+)"/g, function(s) {
				return s.toLowerCase();
			});
			
		// IE9 beta bugs with innerHTML. Test again with final IE9.
		svg = svg.replace(/(url\(#highcharts-[0-9]+)&quot;/g, '$1')
			.replace(/&quot;/g, "'");
		if (svg.match(/ xmlns="/g).length == 2) {
			svg = svg.replace(/xmlns="[^"]+"/, '');
		}
			
		return svg;
	}
});

})();