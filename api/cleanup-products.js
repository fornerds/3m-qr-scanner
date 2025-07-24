const { connectToDatabase } = require('./db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');

    // 1. 잘못된 데이터 삭제 (헤더 행, 잘못된 SKU 등)
    const invalidDataResult = await collection.deleteMany({
      $or: [
        { sku: { $in: ['Sales \r\nRep.', 'JW Park', 'P/C'] } },
        { name: { $in: ['1470', 'P/C'] } },
        { sku: { $regex: /^[A-Za-z\s\r\n]+$/ } }, // 영문자와 공백만 있는 SKU
        { name: { $regex: /^[0-9]+$/ } }, // 숫자만 있는 이름
        { category: '다이소 대분류' },
        { subCategory: '다이소 소분류' }
      ]
    });

    // 2. SKU 중복 제거 (가장 최근 데이터만 유지)
    const duplicateSkus = await collection.aggregate([
      {
        $group: {
          _id: '$sku',
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    let duplicateRemoved = 0;
    for (const duplicate of duplicateSkus) {
      // 가장 최근 데이터를 제외하고 나머지 삭제
      const sortedDocs = duplicate.docs.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      const toDelete = sortedDocs.slice(1); // 첫 번째(최신) 제외하고 삭제
      const deleteIds = toDelete.map(doc => doc._id);
      
      if (deleteIds.length > 0) {
        await collection.deleteMany({ _id: { $in: deleteIds } });
        duplicateRemoved += deleteIds.length;
      }
    }

    // 3. 최종 제품 수 확인
    const totalProducts = await collection.countDocuments();

    // 4. displayOrder 재정렬
    const allProducts = await collection.find({}).sort({ salesAvg: -1 }).toArray();
    const updateOperations = allProducts.map((product, index) => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { displayOrder: index + 1 } }
      }
    }));

    if (updateOperations.length > 0) {
      await collection.bulkWrite(updateOperations);
    }

    res.status(200).json({
      success: true,
      message: '제품 데이터 정리 완료',
      summary: {
        invalidDataRemoved: invalidDataResult.deletedCount,
        duplicateDataRemoved: duplicateRemoved,
        totalProductsAfterCleanup: totalProducts,
        displayOrderUpdated: updateOperations.length
      }
    });

  } catch (error) {
    console.error('제품 데이터 정리 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '제품 데이터 정리 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
}; 