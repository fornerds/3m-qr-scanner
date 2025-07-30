const { connectToDatabase } = require('./config/database');

// 매장 데이터 조회 (MongoDB)
const getStoresData = async () => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('stores');
    
    // 매장이 없으면 기본 매장 생성
    const storesCount = await collection.countDocuments();
    if (storesCount === 0) {
      const defaultStores = [
  {
          _id: '1',
    name: '3M 강남점',
    address: '서울 강남구 강남대로 123',
          lastVisit: new Date('2024-01-15T14:30:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date()
  },
  {
          _id: '2',
    name: '3M 홍대점',
    address: '서울 마포구 홍익로 456',
          lastVisit: new Date('2024-01-14T16:20:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date()
  },
  {
          _id: '3',
    name: '3M 명동점',
    address: '서울 중구 명동길 789',
          lastVisit: new Date('2024-01-13T11:15:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      await collection.insertMany(defaultStores);
    }
    
    const stores = await collection.find({}).toArray();
    return stores.map(store => ({
      id: store._id,
      name: store.name,
      address: store.address,
      lastVisit: store.lastVisit
    }));
  } catch (error) {
    console.error('매장 데이터 조회 오류:', error);
    return [];
  }
};

// MongoDB에서 직접 스캔 기록 조회
const getScanRecordsCount = async (storeId) => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('scan_records');
    // storeId 타입 통일 (문자열로 변환)
    const normalizedStoreId = String(storeId);
    const count = await collection.countDocuments({ storeId: normalizedStoreId });
    console.log(`매장 ${normalizedStoreId} 스캔 기록 수:`, count);
    return count;
  } catch (error) {
    console.error(`매장 ${storeId} 스캔 기록 조회 실패:`, error);
    return 0;
  }
};

// 스캔 기록을 조회하여 실제 작업 통계 계산
const getStoreStats = async (storeId) => {
  try {
    const { db } = await connectToDatabase();
    const scannedItems = await getScanRecordsCount(storeId);
    const totalItems = await db.collection('products').countDocuments();
    const progress = totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;
    
    return {
      totalItems,
      scannedItems,
      progress
    };
  } catch (error) {
    console.error('매장 통계 계산 오류:', error);
    return {
      totalItems: 0,
      scannedItems: 0,
      progress: 0
    };
  }
};

// 매장 목록 조회 API
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('매장 목록 조회 요청');
      
      // 각 매장별 실제 스캔 통계 추가
      const baseStores = await getStoresData();
      const storesWithStats = await Promise.all(
        baseStores.map(async (store) => {
          const stats = await getStoreStats(store.id);
          return {
            ...store,
            scanCount: `${stats.scannedItems}/${stats.totalItems} (${stats.progress}%)`,
            totalItems: stats.totalItems,
            scannedItems: stats.scannedItems,
            progress: stats.progress
          };
        })
      );
      
      res.status(200).json(storesWithStats);
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
      
      // 새 매장 추가
      const { db } = await connectToDatabase();
      const collection = db.collection('stores');
      
      // 새 ID 생성 (기존 매장 수 + 1)
      const storeCount = await collection.countDocuments();
      const newStoreId = String(storeCount + 1);
      
      const storeWithId = {
        _id: newStoreId,
        ...newStore,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(storeWithId);
      console.log('새 매장 추가:', storeWithId);
      
      res.status(201).json({ 
        success: true, 
        storeId: newStoreId,
        message: '매장이 성공적으로 추가되었습니다.'
      });
    } catch (error) {
      console.error('매장 추가 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '매장 추가에 실패했습니다.' 
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { storeId } = req.query;
      const updateData = req.body;
      
      // 매장 수정
      const { db } = await connectToDatabase();
      const collection = db.collection('stores');
      
      const result = await collection.updateOne(
        { _id: storeId },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: '매장을 찾을 수 없습니다.' 
        });
      }
      
      console.log('매장 수정:', storeId, updateData);
      
      res.status(200).json({ 
        success: true, 
        message: '매장이 성공적으로 수정되었습니다.'
      });
    } catch (error) {
      console.error('매장 수정 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '매장 수정에 실패했습니다.' 
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { storeId } = req.query;
      
      if (!storeId) {
        return res.status(400).json({ 
          success: false, 
          message: '매장 ID가 필요합니다.' 
        });
      }
      
      const { db } = await connectToDatabase();
      
      // 1. 먼저 매장이 존재하는지 확인
      const storesCollection = db.collection('stores');
      const store = await storesCollection.findOne({ _id: storeId });
      
      if (!store) {
        return res.status(404).json({ 
          success: false, 
          message: '매장을 찾을 수 없습니다.' 
        });
      }
      
      // 2. 해당 매장의 스캔 기록 삭제
      const scanRecordsCollection = db.collection('scan_records');
      const scanDeleteResult = await scanRecordsCollection.deleteMany({ 
        storeId: String(storeId) 
      });
      
      // 3. 해당 매장의 세션 데이터 삭제
      const sessionsCollection = db.collection('sessions');
      const sessionDeleteResult = await sessionsCollection.deleteMany({ 
        storeId: String(storeId) 
      });
      
      // 4. 매장 삭제
      const storeDeleteResult = await storesCollection.deleteOne({ _id: storeId });
      
      console.log(`매장 삭제 완료: ${storeId}, 스캔 기록 ${scanDeleteResult.deletedCount}개, 세션 ${sessionDeleteResult.deletedCount}개 삭제`);
      
      res.status(200).json({ 
        success: true, 
        message: `매장이 성공적으로 삭제되었습니다. (스캔 기록 ${scanDeleteResult.deletedCount}개, 세션 ${sessionDeleteResult.deletedCount}개 함께 삭제)`
      });
    } catch (error) {
      console.error('매장 삭제 오류:', error);
      res.status(500).json({ 
        success: false, 
        message: '매장 삭제에 실패했습니다.' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 