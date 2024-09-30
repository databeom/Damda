#-*- coding:utf-8 -*-
import sys
import io
import pandas as pd
from pymongo import MongoClient
import json  # JSON 모듈 추가
from bson import ObjectId  # ObjectId 가져오기
import numpy as np  # NumPy 모듈 추가
from dotenv import load_dotenv
import os


# UTF-8 인코딩으로 stdout 재구성
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
load_dotenv()

# MongoDB 서버에 연결
mongo_url = os.getenv('mongoURL')
client = MongoClient(mongo_url)

# df 데이터베이스 선택
db = client['test']  # 'test' 데이터베이스 선택

# df 컬렉션 선택
collection_alpha = db['web']  # 'map' 컬렉션 선택

# df 데이터 조회
documents_alpha = collection_alpha.find()

# df 데이터프레임으로 변환
df = pd.DataFrame(list(documents_alpha))

# area 컬렉션 선택
collection_beta = db['area']  # 'area' 컬렉션 선택

# area 데이터 조회
documents_beta = collection_beta.find()

# area 데이터프레임으로 변환
area_search = pd.DataFrame(list(documents_beta))

def search_tourist_spot(b):
    area_lst = ['서울', '인천', '대전', '대구', '광주', '부산', '울산', '세종','제주도','제주']
    
    sigunguCode = ''
    areaCode = ''

    # 지역 변환 사전 정의
    location_mapping = {
        '울릉도': '울릉군',
        '독도': '울릉군',
        '거제도': '거제시',
        '거문도': '여수시',
        '백도': '여수시',
        '흑산도': '신안군',
        '강화도': '강화군'
    }

    # b 값을 매핑된 지역으로 변환
    b = location_mapping.get(b, b)  # b가 사전에 없으면 원래 값 유지

    
    for name in area_search['sigungu']:
        name = str(name)
        if (name in b) or (b == name[:-1]):
            if name.endswith('시') or name.endswith('군'):
                sigunguCode = int(area_search[area_search['sigungu'] == name]['sigunguCode'].values[0])
                areaCode = int(area_search[area_search['sigungu'] == name]['areaCode'].values[0])
                break
            elif name.endswith('구'):
                if len(area_search[area_search['sigungu'] == name]) == 1:
                    sigunguCode = int(area_search[area_search['sigungu'] == name]['sigunguCode'].values[0])
                    areaCode = int(area_search[area_search['sigungu'] == name]['areaCode'].values[0])
                else:
                    for i in area_lst:
                        if i in b:
                            areaCode = int(area_search[(area_search['area'] == i) & (area_search['sigungu'] == name)]['areaCode'].values[0])
                            sigunguCode = int(area_search[(area_search['area'] == i) & (area_search['sigungu'] == name)]['sigunguCode'].values[0])
                            break
                break
        else:
            for j in area_lst:
                if j in b:
                    areaCode = int(area_search[area_search['area'].str.contains(j)]['areaCode'].values[0])
                    sigunguCode = ''
                    break

    if sigunguCode == '':
        return df[df['areacode'] == areaCode].sort_values('grade', ascending=False).reset_index(drop=True)
    else:
        return df[(df['areacode'] == areaCode) & (df['sigungucode'] == sigunguCode)].sort_values('grade', ascending=False).reset_index(drop=True)

def convert_objectid_to_str(data):
    """ObjectId를 문자열로 변환하는 함수"""
    if isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    elif isinstance(data, dict):
        return {k: convert_objectid_to_str(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    return data

def replace_nan_with_null(data):
    """NaN을 null로 변환하는 함수"""
    if isinstance(data, list):
        return [replace_nan_with_null(item) for item in data]
    elif isinstance(data, dict):
        return {k: replace_nan_with_null(v) for k, v in data.items()}
    elif isinstance(data, float) and np.isnan(data):
        return None  # NaN을 None(null)로 변환
    return data

try:
    input_data = sys.stdin.read().strip()
    output = search_tourist_spot(input_data)

    # 결과 출력
    if not output.empty:
        result = output.to_dict(orient='records')  # 데이터프레임을 리스트 딕셔너리로 변환
        result = convert_objectid_to_str(result)  # ObjectId 변환
        result = replace_nan_with_null(result)  # NaN을 null로 변환
        print(json.dumps(result, ensure_ascii=False))  # JSON으로 출력
    else:
        print(json.dumps({"message": "받은 데이터가 없습니다."}, ensure_ascii=False))  # JSON으로 출력

except Exception as e:
    print(json.dumps({"error": str(e)}, ensure_ascii=False))  # 오류 메시지 JSON으로 출력
