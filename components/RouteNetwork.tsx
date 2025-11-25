import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MarketAnalysis } from '../types';

interface RouteNetworkProps {
  origin: string;
  primary: MarketAnalysis;
  alternatives: MarketAnalysis[];
}

const RouteNetwork: React.FC<RouteNetworkProps> = ({ origin, primary, alternatives }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 600;
    const height = 300;
    const centerX = 100; // Origin on left
    const centerY = height / 2;
    const destX = 500; // Primary dest on right

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // -- Links --

    // Primary Link
    svg.append('line')
      .attr('x1', centerX)
      .attr('y1', centerY)
      .attr('x2', destX)
      .attr('y2', centerY)
      .attr('stroke', '#10b981') // Emerald
      .attr('stroke-width', 4)
      .append('animate')
      .attr('attributeName', 'stroke-dasharray')
      .attr('from', '0, 1000')
      .attr('to', '1000, 0')
      .attr('dur', '1.5s')
      .attr('fill', 'freeze');

    // Alternative Links (Dotted, fanning out)
    alternatives.forEach((alt, i) => {
        const angleOffset = (i - (alternatives.length - 1) / 2) * 0.4; // Fan angle
        const altX = 400;
        const altY = centerY + Math.sin(angleOffset) * 120;

        svg.append('path')
            .attr('d', `M${centerX},${centerY} Q${(centerX+altX)/2},${centerY} ${altX},${altY}`)
            .attr('fill', 'none')
            .attr('stroke', '#475569') // Slate 600
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,4');
        
        // Alt Node
         svg.append('circle')
            .attr('cx', altX)
            .attr('cy', altY)
            .attr('r', 8)
            .attr('fill', '#64748b');
            
        // Alt Label
        svg.append('text')
            .attr('x', altX + 15)
            .attr('y', altY + 4)
            .text(alt.country)
            .attr('fill', '#94a3b8')
            .attr('font-size', '10px');
    });

    // -- Nodes --

    // Origin
    const originG = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);
    originG.append('circle').attr('r', 15).attr('fill', '#3b82f6').attr('stroke', '#1e40af').attr('stroke-width', 3);
    originG.append('text').text(origin).attr('y', 30).attr('text-anchor', 'middle').attr('fill', '#e2e8f0').attr('font-weight', 'bold');

    // Primary Dest
    const destG = svg.append('g').attr('transform', `translate(${destX}, ${centerY})`);
    destG.append('circle').attr('r', 25).attr('fill', '#10b981').attr('stroke', '#065f46').attr('stroke-width', 3);
    destG.append('text').text(primary.country).attr('y', 45).attr('text-anchor', 'middle').attr('fill', '#e2e8f0').attr('font-weight', 'bold').attr('font-size', '14px');

    // Moving particle on primary route
    const particle = svg.append('circle')
        .attr('r', 4)
        .attr('fill', '#ffffff');
    
    particle.append('animate')
        .attr('attributeName', 'cx')
        .attr('from', centerX)
        .attr('to', destX)
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');
    particle.append('animate')
        .attr('attributeName', 'cy')
        .attr('from', centerY)
        .attr('to', centerY)
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');


  }, [origin, primary, alternatives]);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 600 300" className="w-full h-full" />
    </div>
  );
};

export default RouteNetwork;
