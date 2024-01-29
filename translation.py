from googletrans import Translator
import sys
import os
translator = Translator()

#src는 입력언어,  dest는 원하는 출력언어 
def trans(text):
    translated = translator.translate(text, src='ko', dest='en')
    return translated.text

if __name__ == '__main__':
     print(trans(sys.argv[1]))