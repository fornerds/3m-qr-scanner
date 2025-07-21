const { findProductBySku, searchProductsByName, getAllProducts, getProductStats } = require('../src/data/products.js');

module.exports = async function handler(req, res) {
  const { method, query } = req;

  try {
    if (method === 'GET') {
      const { sku, search, page = 1, limit = 20 } = query;

      if (sku) {
        // 특정 SKU로 제품 조회
        const product = findProductBySku(sku);
        if (product) {
          return res.status(200).json({
            success: true,
            found: true,
            product: {
              daisoSku: product.sku,
              daisoName: product.name,
              category: product.category,
              subCategory: product.subCategory,
              price: product.price,
              salesRep: product.salesRep
            }
          });
        } else {
          return res.status(200).json({
            success: true,
            found: false,
            message: '3M 제품이 아님'
          });
        }
      }

      if (search) {
        // 제품명 검색
        const products = searchProductsByName(search);
        return res.status(200).json({
          success: true,
          products: products.map(p => ({
            daisoSku: p.sku,
            daisoName: p.name,
            category: p.category,
            subCategory: p.subCategory,
            price: p.price,
            salesRep: p.salesRep
          })),
          total: products.length
        });
      }

      // 전체 제품 목록 (페이징)
      const allProducts = getAllProducts();
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedProducts = allProducts.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        products: paginatedProducts.map(p => ({
          daisoSku: p.sku,
          daisoName: p.name,
          category: p.category,
          subCategory: p.subCategory,
          price: p.price,
          salesRep: p.salesRep
        })),
        total: allProducts.length,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    }

    if (method === 'POST') {
      const { scannedCode, storeId } = req.body;

      if (!scannedCode) {
        return res.status(400).json({
          success: false,
          message: '스캔된 코드가 필요합니다.'
        });
      }

      // 제품 검색
      const product = findProductBySku(scannedCode.toString());

      if (product) {
        return res.status(200).json({
          success: true,
          found: true,
          product: {
            daisoSku: product.sku,
            daisoName: product.name,
            category: product.category,
            subCategory: product.subCategory,
            price: product.price,
            salesRep: product.salesRep
          },
          message: '3M 제품 확인됨'
        });
      } else {
        return res.status(200).json({
          success: true,
          found: false,
          message: '3M 제품이 아님'
        });
      }
    }

    // 지원하지 않는 메서드
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('제품 API 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
} 