// 하드코딩된 재고 데이터
const INVENTORY_DATA = {
  '1': {
    totalItems: 50,
    scannedItems: 45,
    unstockedItems: 3,
    unavailableItems: 2,
    progress: 90,
    recentScans: [
      {
        productCode: '3M-ADH-001',
        productName: '3M 다목적 접착제',
        category: '사무용품',
        price: '3,500원',
        stock: '재고 24개',
        timestamp: new Date().toISOString()
      },
      {
        productCode: '3M-TAPE-002',
        productName: '3M 강력 테이프',
        category: '사무용품',
        price: '2,800원',
        stock: '재고 18개',
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        productCode: '3M-CLEAN-003',
        productName: '3M 다목적 클리너',
        category: '청소용품',
        price: '4,200원',
        stock: '재고 15개',
        timestamp: new Date(Date.now() - 600000).toISOString()
      }
    ],
    missingItems: [
      {
        productCode: '3M-PROTECT-004',
        productName: '3M 보호 테이프',
        category: '산업용품',
        priority: 'medium',
        status: 'missing'
      },
      {
        productCode: '3M-FILTER-005',
        productName: '3M 공기청정 필터',
        category: '생활용품',
        priority: 'high',
        status: 'missing'
      }
    ],
    lowStockItems: [
      {
        productCode: '3M-ADH-005',
        productName: '3M 강력 접착제',
        category: '산업용품',
        priority: 'high',
        currentStock: 2,
        minStock: 5
      },
      {
        productCode: '3M-SPONGE-006',
        productName: '3M 연마 스펀지',
        category: '청소용품',
        priority: 'medium',
        currentStock: 3,
        minStock: 8
      }
    ]
  },
  '2': {
    totalItems: 50,
    scannedItems: 38,
    unstockedItems: 5,
    unavailableItems: 7,
    progress: 76,
    recentScans: [
      {
        productCode: '3M-TAPE-002',
        productName: '3M 강력 테이프',
        category: '사무용품',
        price: '2,800원',
        stock: '재고 12개',
        timestamp: new Date().toISOString()
      }
    ],
    missingItems: [
      {
        productCode: '3M-CLEAN-003',
        productName: '3M 다목적 클리너',
        category: '청소용품',
        priority: 'high',
        status: 'missing'
      }
    ],
    lowStockItems: []
  },
  '3': {
    totalItems: 50,
    scannedItems: 42,
    unstockedItems: 4,
    unavailableItems: 4,
    progress: 84,
    recentScans: [
      {
        productCode: '3M-FILTER-005',
        productName: '3M 공기청정 필터',
        category: '생활용품',
        price: '8,900원',
        stock: '재고 6개',
        timestamp: new Date().toISOString()
      }
    ],
    missingItems: [],
    lowStockItems: [
      {
        productCode: '3M-SPONGE-006',
        productName: '3M 연마 스펀지',
        category: '청소용품',
        priority: 'medium',
        currentStock: 1,
        minStock: 8
      }
    ]
  }
};

// 재고 현황 조회 API
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { storeId } = req.query;
      console.log('재고 조회 요청, storeId:', storeId);
      
      // 기본값 설정
      const defaultInventory = {
        totalItems: 50,
        scannedItems: 0,
        unstockedItems: 0,
        unavailableItems: 0,
        progress: 0,
        recentScans: [],
        missingItems: [],
        lowStockItems: []
      };
      
      // storeId에 해당하는 재고 데이터 조회
      const inventory = storeId && INVENTORY_DATA[storeId] 
        ? INVENTORY_DATA[storeId] 
        : defaultInventory;
      
      res.status(200).json(inventory);
    } catch (error) {
      console.error('재고 조회 오류:', error);
      
      // 오류 시 기본 데이터 반환
      const fallbackInventory = {
        totalItems: 50,
        scannedItems: 45,
        unstockedItems: 3,
        unavailableItems: 2,
        progress: 90,
        recentScans: [
          {
            productCode: '3M-ADH-001',
            productName: '3M 다목적 접착제',
            category: '사무용품',
            price: '3,500원',
            stock: '재고 24개',
            timestamp: new Date().toISOString()
          }
        ],
        missingItems: [],
        lowStockItems: []
      };
      
      res.status(200).json(fallbackInventory);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 