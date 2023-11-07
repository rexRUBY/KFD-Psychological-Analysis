from kiwipiepy.utils import Stopwords
from kiwipiepy import Kiwi
import sys
import os

# text="""
# 즐거운 표정의 3인 가정 엄마와 아빠는 앉아있고 5살짜리 남자아이는 앉아서 책을 읽고 있다.
# """

kiwi = Kiwi()


# 추출 함수
def extractor(text):
    results = ""
    result = kiwi.analyze(text)
    for token, pos, _, _ in result[0][0]:
        if len(token) != 1 and pos.startswith('N') or pos.startswith('VV') or pos.startswith('VN') or pos.startswith('VA') or pos.startswith('SN') or pos.startswith('SL') or pos.startswith('XR'):
            results += token + " "
    return results

if __name__ == '__main__':
     print(extractor(sys.argv[1]))