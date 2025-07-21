// 하드코딩된 매장 데이터
const STORES_DATA = [
  {
    id: '1',
    name: '3M 강남점',
    address: '서울 강남구 강남대로 123',
    scanCount: '45/50 (90%)',
    lastVisit: '2024-01-15 14:30',
    distance: '0.5km',
    isOpen: true,
    operatingHours: '10:00 - 22:00',
    totalItems: 50,
    scannedItems: 45,
    unstockedItems: 3,
    unavailableItems: 2
  },
  {
    id: '2',
    name: '3M 홍대점',
    address: '서울 마포구 홍익로 456',
    scanCount: '38/50 (76%)',
    lastVisit: '2024-01-14 16:20',
    distance: '1.2km',
    isOpen: true,
    operatingHours: '09:00 - 21:00',
    totalItems: 50,
    scannedItems: 38,
    unstockedItems: 5,
    unavailableItems: 7
  },
  {
    id: '3',
    name: '3M 명동점',
    address: '서울 중구 명동길 789',
    scanCount: '42/50 (84%)',
    lastVisit: '2024-01-13 11:15',
    distance: '2.1km',
    isOpen: false,
    operatingHours: '10:30 - 20:30',
    totalItems: 50,
    scannedItems: 42,
    unstockedItems: 4,
    unavailableItems: 4
  }
];

// 매장 목록 조회 API
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('매장 목록 조회 요청');
      res.status(200).json(STORES_DATA);
    } catch (error) {
      console.error('매장 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '매장 목록을 가져올 수 없습니다.' 
      });
    }
  } else if (req.method === 'POST') {
    try {
      const newStore = req.body;
      
      // 새 매장 추가 (실제로는 메모리에만 저장됨)
      const storeWithId = {
        ...newStore,
        id: String(STORES_DATA.length + 1),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      STORES_DATA.push(storeWithId);
      
      res.status(201).json({ 
        success: true, 
        storeId: storeWithId.id,
        message: '매장이 성공적으로 추가되었습니다.'
      });
    } catch (error) {
      console.error('매장 추가 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '매장 추가에 실패했습니다.' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 