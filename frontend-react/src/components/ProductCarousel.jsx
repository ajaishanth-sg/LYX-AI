import React from 'react';
import { ExternalLink, Star } from 'lucide-react';
import '../index.css';

export default function ProductCarousel({ products }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="product-showcase-container">
      {/* Horizontal Carousel */}
      <div className="product-carousel">
        {products.map((product, idx) => (
          <div key={idx} className="product-card">
            <div className="product-image-wrap">
              <img src={product.image} alt={product.name} className="product-image" onError={e => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;width:100%;background:#f3f4f6;color:#9ca3af;font-size:12px">No Image</div>';
              }} />
            </div>
            <div className="product-info">
              <h4 className="product-title">{product.name}</h4>
              <div className="product-price">{product.price}</div>
              <p className="product-desc">{product.description}</p>
              {product.rating && (
                <div className="product-rating">
                  <Star size={12} fill="currentColor" /> {product.rating}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Shortlist Table */}
      <div className="product-shortlist">
        <h3 className="shortlist-title">My shortlist</h3>
        <div className="shortlist-table-container">
          <table className="shortlist-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Best for</th>
                <th style={{ textAlign: 'right' }}>Approx. price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => (
                <tr key={idx}>
                  <td>
                    <a href={product.url || "#"} target="_blank" rel="noopener noreferrer" className="shortlist-link">
                      {product.name} <ExternalLink size={12} style={{ display: 'inline', marginLeft: 4, opacity: 0.5 }} />
                    </a>
                  </td>
                  <td className="shortlist-desc">{product.description?.split(' ').slice(0, 5).join(' ')}...</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{product.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
